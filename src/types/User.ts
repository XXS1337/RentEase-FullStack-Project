// Interface representing a user in the system.

export default interface User {
  id: string; // Unique identifier for the user (Firestore document ID)
  firstName: string; // User's first name
  lastName: string; // User's last name
  email: string; // User's email address
  birthDate?: string; // Optional: User's date of birth in YYYY-MM-DD format
  password?: string; // Optional: User's password (hashed for security)
  createdAt?: string; // Optional: Timestamp when the account was created
  role: 'user' | 'admin';
}
