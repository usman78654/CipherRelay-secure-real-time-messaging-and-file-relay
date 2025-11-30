const ContactList = ({ contacts, onSelect, selectedContact }) => {
  return (
    <div className="contact-list">
      <h3>Contacts</h3>
      <div className="contacts-scroll">
        {contacts?.map((contact) => (
          <div
            key={contact.id}
            className={`contact-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
            onClick={() => onSelect(contact)}
          >
            <div className="contact-avatar">
              {contact.name ? contact.name[0].toUpperCase() : '?'}
            </div>
            <div className="contact-info">
              <strong>{contact.name}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactList;
