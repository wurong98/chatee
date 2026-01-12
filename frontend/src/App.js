import React, { useState } from 'react';
import './App.css';
import StartCall from './components/StartCall';
import JoinCall from './components/JoinCall';
import CallScreen from './components/CallScreen';

function App() {
  const [page, setPage] = useState('start'); // 'start', 'join', 'call'
  const [callData, setCallData] = useState(null);

  const handleStartCall = (data) => {
    setCallData(data);
    setPage('call');
  };

  const handleJoinCall = (data) => {
    setCallData(data);
    setPage('call');
  };

  const handleCallEnd = () => {
    setCallData(null);
    setPage('start');
  };

  return (
    <div className="App">
      {page === 'start' && (
        <StartCall
          onStartCall={handleStartCall}
          onGoToJoin={() => setPage('join')}
        />
      )}
      {page === 'join' && (
        <JoinCall onJoinCall={handleJoinCall} onGoToStart={() => setPage('start')} />
      )}
      {page === 'call' && <CallScreen callData={callData} onCallEnd={handleCallEnd} />}
    </div>
  );
}

export default App;
