import ContactList from "../components/Contacts/ContactList";
import KeyStatus from "../components/KeyStatus";
import { useState, useEffect } from "react";
import { getAllUsers } from "../api/authAPI";

const Dashboard = ({ user, contacts, onSelectContact }) => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAllUsers();
        // Filter out current user and map to contact format
        const users = response.data
          .filter(u => u._id !== user?.id && u._id !== user?.user?.id)
          .map(u => ({ id: u._id, name: u.username }));
        setAllUsers(users);
      } catch (err) {
        console.warn('Failed to fetch users:', err);
        // Fallback to mock contacts if API fails
        setAllUsers(contacts || []);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user, contacts]);

  const handleSelect = (contact) => {
    setSelectedContact(contact);
    onSelectContact(contact);
  };

  return (
    <div className="page dashboard-page">
      <ContactList 
        contacts={allUsers} 
        onSelect={handleSelect}
        selectedContact={selectedContact}
      />
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <KeyStatus user={user} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781', fontSize: '16px', minHeight: '200px' }}>
          {loading ? (
            <div>Loading contacts...</div>
          ) : selectedContact ? (
            <div>Chat with {selectedContact.name} - Click "Chat" in the menu to open the chat window</div>
          ) : (
            <div>{allUsers.length > 0 ? 'Select a contact to start messaging' : 'No other users found. Register more accounts to see contacts.'}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
