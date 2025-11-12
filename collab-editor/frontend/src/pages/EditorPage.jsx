import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import CollaborativeEditor from '../components/CollaborativeEditor';
import useAuthStore from '../store/useAuthStore';
import { documentsAPI } from '../services/api';

const EditorPage = () => {
  const { documentId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await documentsAPI.getById(documentId);
      console.log('Document response:', response);
      
      // Handle both response formats
      const doc = response.data?.document || response.document;
      
      if (!doc) {
        console.error('No document in response:', response);
      }
      
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
      console.error('Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Document not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{document.title}</h1>
            <p className="text-xs text-gray-500">
              {document.language} • Auto-saved
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {user?.displayName || user?.username}
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ backgroundColor: user?.color }}
          >
            {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CollaborativeEditor
          documentId={documentId}
          userColor={user?.color}
          username={user?.displayName || user?.username}
        />
      </div>
    </div>
  );
};

export default EditorPage;
