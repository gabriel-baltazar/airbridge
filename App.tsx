import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { AppMode, TransferStatus, FileMeta, DataPacket } from './types';
import { SendIcon, DownloadIcon, FileIcon, SmartphoneIcon, CheckIcon, RadarIcon, XIcon } from './components/Icons';
import { Button } from './components/Button';
import { RadarScan } from './components/RadarScan';

// Tamanho do pedaço do arquivo (64KB para estabilidade)
const CHUNK_SIZE = 64 * 1024;

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [status, setStatus] = useState<TransferStatus>(TransferStatus.IDLE);
  
  // Meus dados
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  
  // Transferência
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [receivedChunks, setReceivedChunks] = useState<ArrayBuffer[]>([]);
  const [receivedSize, setReceivedSize] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Refs para manter persistência durante callbacks
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]); // Ref para chunks recebidos (performance)

  // Limpeza ao desmontar ou trocar de modo
  useEffect(() => {
    return () => {
      destroyConnection();
    };
  }, []);

  const destroyConnection = () => {
    if (connRef.current) {
      connRef.current.close();
      connRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setMyPeerId('');
    setProgress(0);
    setReceivedChunks([]);
    setReceivedSize(0);
    chunksRef.current = [];
    setDownloadUrl(null);
  };

  const switchMode = (newMode: AppMode) => {
    destroyConnection();
    setMode(newMode);
    setStatus(TransferStatus.IDLE);
    
    if (newMode === AppMode.RECEIVER) {
      initializeReceiver();
    } else if (newMode === AppMode.SENDER) {
      initializeSender();
    }
  };

  // --- Lógica do PeerJS ---

  const generateShortId = () => {
    // Gera ID aleatório de 6 caracteres
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const initializeReceiver = () => {
    setStatus(TransferStatus.WAITING_FOR_ID);
    
    const id = generateShortId();
    // Usamos o servidor público gratuito do PeerJS
    const peer = new Peer(id);

    peer.on('open', (id) => {
      setMyPeerId(id);
      setStatus(TransferStatus.WAITING_FOR_CONNECTION);
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setStatus(TransferStatus.CONNECTING);

      conn.on('data', (data) => handleIncomingData(data as DataPacket));
      
      conn.on('close', () => {
        // Se fechar mas não tiver completado
        if (status !== TransferStatus.COMPLETED) {
           alert('Conexão perdida.');
           setStatus(TransferStatus.WAITING_FOR_CONNECTION);
        }
      });
    });

    peer.on('error', (err) => {
      console.error(err);
      alert('Erro na conexão: ' + err.type);
    });

    peerRef.current = peer;
  };

  const initializeSender = () => {
    // Sender cria um peer com ID aleatório do sistema
    const peer = new Peer();
    peer.on('open', (id) => {
      setMyPeerId(id);
    });
    peerRef.current = peer;
  };

  const connectToReceiver = () => {
    if (!peerRef.current || !targetId) return;
    
    setStatus(TransferStatus.CONNECTING);
    const conn = peerRef.current.connect(targetId.toUpperCase());

    conn.on('open', () => {
      connRef.current = conn;
      if (selectedFile) {
        sendFile(selectedFile);
      }
    });

    conn.on('error', (err) => {
      alert('Erro ao conectar com destinatário. Verifique o ID.');
      setStatus(TransferStatus.IDLE);
    });
  };

  // --- Lógica de Transferência de Dados ---

  const sendFile = async (file: File) => {
    if (!connRef.current) return;
    setStatus(TransferStatus.TRANSFERRING);
    
    // 1. Enviar Header
    const meta: FileMeta = { name: file.name, size: file.size, type: file.type };
    connRef.current.send({ type: 'header', meta });

    // 2. Enviar Chunks
    let offset = 0;
    const reader = new FileReader();

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!connRef.current) return;
      
      const buffer = e.target?.result as ArrayBuffer;
      connRef.current.send({ type: 'chunk', data: buffer });
      
      offset += buffer.byteLength;
      setProgress(Math.round((offset / file.size) * 100));

      if (offset < file.size) {
        // Pequeno delay para não engasgar a thread da UI e o buffer do WebRTC
        setTimeout(readNextChunk, 5); 
      } else {
        connRef.current.send({ type: 'end' });
        setStatus(TransferStatus.COMPLETED);
      }
    };

    readNextChunk();
  };

  const handleIncomingData = (packet: DataPacket) => {
    if (packet.type === 'header') {
      setFileMeta(packet.meta);
      setStatus(TransferStatus.TRANSFERRING);
      setReceivedSize(0);
      chunksRef.current = [];
      setProgress(0);
    } 
    else if (packet.type === 'chunk') {
      chunksRef.current.push(packet.data);
      
      // Atualizar progresso visual
      setReceivedSize(prev => {
        const newSize = prev + packet.data.byteLength;
        if (fileMeta) {
            setProgress(Math.round((newSize / fileMeta.size) * 100));
        }
        return newSize;
      });
    } 
    else if (packet.type === 'end') {
      setStatus(TransferStatus.COMPLETED);
      // Montar o arquivo final
      const blob = new Blob(chunksRef.current, { type: fileMeta?.type });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black font-sans relative overflow-hidden">
      
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <header className="p-6 flex justify-between items-center backdrop-blur-md bg-black/20 sticky top-0 z-50 border-b border-white/5">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
          onClick={() => switchMode(AppMode.HOME)}
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <SendIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">AirBridge</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* HOME MODE */}
        {mode === AppMode.HOME && (
          <div className="flex flex-col gap-6 w-full animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-200 to-blue-500">
                P2P Ultra Rápido.
              </h2>
              <p className="text-gray-400 text-lg">
                Transferência direta de dispositivo para dispositivo. Sem nuvem, sem limites.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                    onClick={() => switchMode(AppMode.SENDER)}
                    className="group relative overflow-hidden p-8 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800/50"
                >
                    <SendIcon className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition duration-300" />
                    <h3 className="text-2xl font-bold text-white mb-2">Enviar</h3>
                    <p className="text-gray-400 text-sm">Quero enviar um arquivo para outro dispositivo.</p>
                </div>

                <div 
                    onClick={() => switchMode(AppMode.RECEIVER)}
                    className="group relative overflow-hidden p-8 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer hover:bg-slate-800/50"
                >
                    <DownloadIcon className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition duration-300" />
                    <h3 className="text-2xl font-bold text-white mb-2">Receber</h3>
                    <p className="text-gray-400 text-sm">Quero receber um arquivo neste dispositivo.</p>
                </div>
            </div>
          </div>
        )}

        {/* SENDER MODE */}
        {mode === AppMode.SENDER && (
          <div className="w-full flex flex-col items-center animate-fade-in-up">
            
            {status === TransferStatus.IDLE && (
              <>
                {!selectedFile ? (
                   <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-3xl bg-slate-900/30 hover:bg-slate-900/50 hover:border-cyan-500/50 transition cursor-pointer group mb-6">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FileIcon className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition" />
                          <p className="mb-2 text-xl text-gray-300 font-semibold">Escolher Arquivo</p>
                      </div>
                      <input type="file" className="hidden" onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])} />
                  </label>
                ) : (
                  <div className="w-full bg-slate-800 p-6 rounded-2xl mb-6 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-4 overflow-hidden">
                       <FileIcon className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                       <div className="overflow-hidden">
                          <p className="font-bold truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                       </div>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-white/10 rounded-full">
                       <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {selectedFile && (
                  <div className="w-full max-w-sm bg-slate-900 p-6 rounded-2xl border border-white/10 shadow-xl">
                      <p className="mb-2 text-sm text-gray-400">Insira o ID do Recebedor:</p>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="Ex: A1B2C3"
                          className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 font-mono text-center uppercase tracking-widest text-lg"
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                        />
                        <Button onClick={connectToReceiver} disabled={targetId.length < 6}>
                          Enviar
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-4 text-center">Peça para a outra pessoa clicar em "Receber" e te informar o código.</p>
                  </div>
                )}
              </>
            )}

            {status === TransferStatus.CONNECTING && (
               <div className="text-center">
                  <RadarScan />
                  <p className="mt-4 text-cyan-400 font-medium">Conectando a {targetId}...</p>
               </div>
            )}
          </div>
        )}

        {/* RECEIVER MODE */}
        {mode === AppMode.RECEIVER && (
          <div className="w-full flex flex-col items-center text-center animate-fade-in-up">
             
             {(status === TransferStatus.WAITING_FOR_ID || status === TransferStatus.WAITING_FOR_CONNECTION) && (
                <div className="bg-slate-900 p-8 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(8,145,178,0.2)]">
                   <p className="text-gray-400 mb-2">Seu Código de Recebimento</p>
                   {myPeerId ? (
                     <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider mb-8">
                       {myPeerId}
                     </div>
                   ) : (
                     <div className="h-12 w-32 bg-slate-800 rounded animate-pulse mx-auto mb-8"></div>
                   )}
                   
                   <div className="flex justify-center mb-4">
                     <div className="relative">
                       <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute top-0 right-0"></div>
                       <RadarIcon className="w-8 h-8 text-gray-500" />
                     </div>
                   </div>
                   <p className="text-sm text-gray-500 animate-pulse">Aguardando conexão...</p>
                </div>
             )}

             {status === TransferStatus.CONNECTING && (
               <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p>Preparando recebimento...</p>
               </div>
             )}
          </div>
        )}

        {/* SHARED: TRANSFER PROGRESS */}
        {(status === TransferStatus.TRANSFERRING || status === TransferStatus.COMPLETED) && (
             <div className="w-full max-w-sm text-center animate-fade-in-up">
                 <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle className="text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                         <circle 
                            className={`${status === TransferStatus.COMPLETED ? 'text-green-500' : 'text-cyan-500'} transition-all duration-200 ease-linear`} 
                            strokeWidth="8" 
                            strokeDasharray={251.2} 
                            strokeDashoffset={251.2 - (251.2 * progress) / 100} 
                            strokeLinecap="round" 
                            stroke="currentColor" 
                            fill="transparent" 
                            r="40" 
                            cx="50" 
                            cy="50" 
                         />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         {status === TransferStatus.COMPLETED ? (
                             <CheckIcon className="w-16 h-16 text-green-500 animate-scale-in" />
                         ) : (
                             <span className="text-3xl font-bold font-mono">{progress}%</span>
                         )}
                     </div>
                 </div>

                 <h3 className="text-2xl font-bold mb-2">
                     {status === TransferStatus.COMPLETED ? 'Sucesso!' : (mode === AppMode.SENDER ? 'Enviando...' : 'Recebendo...')}
                 </h3>
                 
                 {fileMeta && (
                   <p className="text-gray-400 mb-8 truncate px-4">
                      {fileMeta.name} ({formatBytes(fileMeta.size)})
                   </p>
                 )}

                 {status === TransferStatus.COMPLETED && (
                     <div className="flex flex-col gap-3">
                        {downloadUrl && mode === AppMode.RECEIVER && (
                             <a 
                               href={downloadUrl} 
                               download={fileMeta?.name}
                               className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"
                             >
                                <DownloadIcon className="w-5 h-5" />
                                Salvar Arquivo
                             </a>
                        )}
                        <Button variant="secondary" onClick={() => switchMode(AppMode.HOME)}>
                            Nova Transferência
                        </Button>
                     </div>
                 )}
             </div>
        )}

      </main>
    </div>
  );
}

export default App;