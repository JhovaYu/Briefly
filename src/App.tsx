import { useState } from 'react';
import { Editor } from './infrastructure/ui/components/Editor';
import { services } from './infrastructure/AppServices';
import './infrastructure/ui/styles/index.css';

function App() {
  const [joined, setJoined] = useState(false);
  const [poolId, setPoolId] = useState('');
  const [loading, setLoading] = useState(false);

  // Random user for demo
  const [user] = useState({
    name: `User-${Math.floor(Math.random() * 1000)}`,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16)
  });

  const handleCreate = async () => {
    setLoading(true);
    const pool = await services.createPool("New Pool");
    setPoolId(pool.id);
    await services.initialize(pool.id);
    setJoined(true);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!poolId) return;
    setLoading(true);
    await services.joinPool(poolId);
    setJoined(true);
    setLoading(false);
  };

  if (joined) {
    return (
      <div className="app-container p-4">
        <header className="flex justify-between items-center mb-4 border-b p-2">
          <h1 className="text-xl font-bold">TuxNotas P2P</h1>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400">Pool: {poolId}</span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: user.color }}></div>
            <span className="text-sm">{user.name}</span>
            <button onClick={() => window.location.reload()} className="p-1 border rounded hover:bg-gray-100 text-xs text-red-500">Disconnect</button>
          </div>
        </header>
        <main>
          <Editor
            doc={services.doc}
            provider={(services.network as any).provider} // Cast to any to access internal provider or expose it better
            user={user}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[500px] h-screen bg-gray-50">
      <div className="p-8 bg-white rounded shadow-md border w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6">TuxNotas P2P</h1>
        <p className="mb-6 text-gray-400">Collaborative notes without servers.</p>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {loading ? 'Creating...' : 'Create New Pool'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or join existing</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Pool ID"
              value={poolId}
              onChange={(e) => setPoolId(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleJoin}
              disabled={loading || !poolId}
              className="p-2 border rounded hover:bg-gray-100"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
