import React, { useState, useEffect, useRef } from 'react';
import { AppMode, TransferStatus, FileMeta, Peer } from './types';
import { generateSessionName, analyzeFileContent } from './services/geminiService';
import { SendIcon, DownloadIcon, FileIcon, SmartphoneIcon, LaptopIcon, CheckIcon, XIcon, RadarIcon } from './components/Icons';
import { Button } from './components/Button';
import { RadarScan } from './components/RadarScan';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [status, setStatus] = useState<TransferStatus>(TransferStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<FileMeta | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [progress, setProgress] = useState(0);
  const [connectedPeer, setConnectedPeer] = useState<Peer | null>(null);

  // Reset state when changing modes
  const switchMode = (newMode: AppMode) => {
    setMode(newMode);
    setStatus(TransferStatus.IDLE);
    setProgress(0);
    setPeers([]);
    setConnectedPeer(null);
    if (newMode === AppMode.HOME) {
      setSelectedFile(null);
      setFileMeta(null);
    }
  };

  // Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setStatus(TransferStatus.SCANNING);

      // Analyze file with Gemini
      const summary = await analyzeFileContent(file.name, file.type);
      
      setFileMeta({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        aiSummary: summary
      });

      // Generate a session name for fun
      const name = await generateSessionName();
      setSessionName(name);

      // Simulate Scanning for Peers
      startMockScanning();
    }
  };

  // Mock Discovery Mechanism
  const startMockScanning = () => {
    setTimeout(() => {
      setPeers([
        { id: '1', name: 'iPhone de Maria', device: 'mobile', status: 'available' },
        { id: '2', name: 'MacBook Pro', device: 'desktop', status: 'available' },
        { id: '3', name: 'Galaxy S23', device: 'mobile', status: 'busy' }
      ]);
    }, 2500);
  };

  // Start Transfer
  const connectToPeer = (peer: Peer) => {
    setConnectedPeer(peer);
    setStatus(TransferStatus.CONNECTING);
    
    // Simulate handshake
    setTimeout(() => {
      setStatus(TransferStatus.TRANSFERRING);
      simulateTransfer();
    }, 1500);
  };

  // Simulate Transfer Progress
  const simulateTransfer = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15; // Random speed
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setStatus(TransferStatus.COMPLETED);
      }
      setProgress(Math.floor(currentProgress));
    }, 300);
  };

  // Receiver Flow simulation
  const startReceiver = async () => {
    switchMode(AppMode.RECEIVER);
    setStatus(TransferStatus.SCANNING);
    const name = await generateSessionName();
    setSessionName(name);
    
    // Simulate an incoming request after a delay
    setTimeout(() => {
        setConnectedPeer({ id: 'sender-1', name: 'iPad de João', device: 'tablet', status: 'available' });
        setFileMeta({
            id: 'mock-file',
            name: 'Projeto_Final_2024.pdf',
            size: 1024 * 1024 * 5.2, // 5.2 MB
            type: 'application/pdf',
            aiSummary: 'Documento Acadêmico Importante'
        });
        setStatus(TransferStatus.CONNECTING); // "Incoming request" state
    }, 4000);
  };

  const acceptTransfer = () => {
      setStatus(TransferStatus.TRANSFERRING);
      simulateTransfer();
  };

  // Render Helper: File Size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black font-sans relative overflow-hidden">
      
      {/* Dynamic Background */}
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
        {sessionName && (
             <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
                ID: {sessionName}
             </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* HOME MODE */}
        {mode === AppMode.HOME && (
          <div className="flex flex-col gap-6 w-full animate-fade-in-up">
            <div className="text-center mb-8">
              <h2 className="text-4xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-200 to-blue-500">
                Compartilhe na<br/>velocidade da luz.
              </h2>
              <p className="text-gray-400 text-lg">
                Transferência P2P criptografada. Funciona em iOS, Android e Desktop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                    onClick={() => switchMode(AppMode.SENDER)}
                    className="group relative overflow-hidden p-8 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer hover:bg-slate-800/50"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <SendIcon className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition duration-300" />
                    <h3 className="text-2xl font-bold text-white mb-2">Enviar</h3>
                    <p className="text-gray-400 text-sm">Transferir fotos, vídeos ou documentos.</p>
                </div>

                <div 
                    onClick={startReceiver}
                    className="group relative overflow-hidden p-8 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer hover:bg-slate-800/50"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <DownloadIcon className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition duration-300" />
                    <h3 className="text-2xl font-bold text-white mb-2">Receber</h3>
                    <p className="text-gray-400 text-sm">Tornar-se visível para dispositivos próximos.</p>
                </div>
            </div>
          </div>
        )}

        {/* SENDER MODE */}
        {mode === AppMode.SENDER && (
          <div className="w-full flex flex-col items-center">
            
            {status === TransferStatus.IDLE && (
               <div className="w-full">
                  <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-gray-600 rounded-3xl bg-slate-900/30 hover:bg-slate-900/50 hover:border-cyan-500/50 transition cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="p-4 rounded-full bg-slate-800 mb-4 group-hover:scale-110 transition">
                            <FileIcon className="w-8 h-8 text-cyan-400" />
                          </div>
                          <p className="mb-2 text-xl text-gray-300 font-semibold">Toque para escolher</p>
                          <p className="text-sm text-gray-500">ou arraste seus arquivos aqui</p>
                      </div>
                      <input type="file" className="hidden" onChange={handleFileSelect} />
                  </label>
               </div>
            )}

            {(status === TransferStatus.SCANNING || status === TransferStatus.CONNECTING) && (
                <div className="w-full text-center">
                    <RadarScan />
                    
                    {fileMeta && (
                        <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-sm mx-auto flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {fileMeta.previewUrl ? (
                                    <img src={fileMeta.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <FileIcon className="text-gray-400" />
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-white truncate">{fileMeta.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{formatBytes(fileMeta.size)}</span>
                                  {fileMeta.aiSummary && (
                                    <span className="text-[10px] text-cyan-300 border border-cyan-900 px-2 py-0.5 rounded">{fileMeta.aiSummary}</span>
                                  )}
                                </div>
                            </div>
                        </div>
                    )}

                    <h3 className="text-gray-400 mb-6 uppercase text-xs tracking-widest font-semibold">Dispositivos Próximos</h3>
                    
                    <div className="space-y-3">
                        {peers.length === 0 ? (
                            <div className="h-20 flex items-center justify-center text-gray-600">Procurando...</div>
                        ) : (
                            peers.map(peer => (
                                <button
                                    key={peer.id}
                                    onClick={() => connectToPeer(peer)}
                                    disabled={peer.status === 'busy' || status === TransferStatus.CONNECTING}
                                    className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500 flex items-center justify-between group transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-slate-700 rounded-full text-cyan-400 group-hover:bg-cyan-900/30 transition">
                                            {peer.device === 'mobile' ? <SmartphoneIcon /> : <LaptopIcon />}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">{peer.name}</p>
                                            <p className="text-xs text-gray-400 capitalize">{peer.status}</p>
                                        </div>
                                    </div>
                                    {status === TransferStatus.CONNECTING && connectedPeer?.id === peer.id && (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
        )}

        {/* RECEIVER MODE */}
        {mode === AppMode.RECEIVER && status !== TransferStatus.TRANSFERRING && status !== TransferStatus.COMPLETED && (
             <div className="w-full text-center">
                {status === TransferStatus.SCANNING ? (
                     <>
                        <RadarScan />
                        <p className="text-gray-400 mt-4">Visível como <span className="text-white font-bold">{sessionName}</span></p>
                        <p className="text-sm text-gray-600 mt-2">Mantenha esta tela aberta.</p>
                     </>
                ) : status === TransferStatus.CONNECTING && connectedPeer && fileMeta ? (
                    <div className="animate-fade-in-up bg-slate-900 border border-cyan-500/30 p-8 rounded-3xl w-full max-w-sm mx-auto shadow-2xl shadow-cyan-900/20">
                         <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center animate-bounce">
                             <DownloadIcon className="w-10 h-10 text-cyan-400" />
                         </div>
                         <h3 className="text-2xl font-bold text-white mb-2">{connectedPeer.name}</h3>
                         <p className="text-gray-400 mb-6">quer enviar um arquivo</p>
                         
                         <div className="bg-black/30 p-4 rounded-xl mb-6 text-left border border-white/5">
                            <p className="text-white font-medium truncate">{fileMeta.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{formatBytes(fileMeta.size)} • {fileMeta.aiSummary}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <Button variant="secondary" onClick={() => switchMode(AppMode.HOME)}>Recusar</Button>
                             <Button onClick={acceptTransfer}>Aceitar</Button>
                         </div>
                    </div>
                ) : null}
             </div>
        )}

        {/* SHARED: TRANSFER STATUS */}
        {(status === TransferStatus.TRANSFERRING || status === TransferStatus.COMPLETED) && (
             <div className="w-full max-w-sm text-center animate-fade-in-up">
                 <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                     {/* Circular Progress SVG */}
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                         <circle className="text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                         <circle 
                            className={`${status === TransferStatus.COMPLETED ? 'text-green-500' : 'text-cyan-500'} transition-all duration-300 ease-out`} 
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
                     {status === TransferStatus.COMPLETED ? 'Transferência Concluída!' : 'Enviando Arquivo...'}
                 </h3>
                 <p className="text-gray-400 mb-8">
                    {status === TransferStatus.COMPLETED 
                        ? `${fileMeta?.name} foi transferido com sucesso.` 
                        : `Conectado a ${connectedPeer?.name} via WebRTC seguro.`
                    }
                 </p>

                 {status === TransferStatus.COMPLETED && (
                     <div className="flex flex-col gap-3">
                        {mode === AppMode.RECEIVER && (
                             <Button className="w-full" onClick={() => alert('Download simulated started')}>
                                Salvar no Dispositivo
                             </Button>
                        )}
                        <Button variant="secondary" onClick={() => switchMode(AppMode.HOME)}>
                            Enviar outro arquivo
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
