import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, LogOut } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { documentsAPI } from '../services/api';

const DashboardPage = () => {
  const { user, logout } = useAuthStore();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.getAll();
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (e) => {
    e.preventDefault();
    try {
      const response = await documentsAPI.create({ title });
      navigate(`/editor/${response.data.document._id}`);
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.displayName || user?.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => setShowCreateModal(true)}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={20} />
          New Document
        </button>

        {loading ? (
          <p className="text-gray-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No documents yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <div
                key={doc._id}
                onClick={() => navigate(`/editor/${doc._id}`)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                  <FileText size={20} className="text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
                {doc.activeUsers && doc.activeUsers.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {doc.activeUsers.slice(0, 3).map(u => (
                      <div
                        key={u._id}
                        className="w-6 h-6 rounded-full text-xs text-white flex items-center justify-center"
                        style={{ backgroundColor: u.color }}
                        title={u.displayName || u.username}
                      >
                        {(u.displayName || u.username)[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Document</h2>
            <form onSubmit={createDocument}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
