// Interface representing a message in the system.

export default interface Message {
  id: string; // Unique identifier for the message
  senderId: string; // ID of the user who sent the message
  senderName: string; // Name of the sender
  senderEmail: string; // Email address of the sender
  content: string; // The content of the message
  creationTime: string; // Timestamp when the message was created
  flatID: string; // ID of the flat associated with the message
}
