import axios from '../api/axiosConfig';
import Cookies from 'js-cookie';

// Generic type for state update function (optional usage in admin tables)
type SetUsersFunction<T> = React.Dispatch<React.SetStateAction<T[]>> | null;

// Function to remove a user by ID using backend API
const handleRemoveUser = async <T extends { id: string }>(userId: string, setUsers?: SetUsersFunction<T>): Promise<void> => {
  try {
    const token = Cookies.get('token');
    const isSelf = userId === 'me';

    // Determine API endpoint
    const endpoint = isSelf ? '/users/deleteMyProfile' : `/users/deleteProfile/${userId}`;

    // Make DELETE request to backend
    await axios.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Optional: update UI list if function provided and it's not self-deletion
    if (setUsers && !isSelf) {
      setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
    }
  } catch (error: any) {
    console.error('Error removing user:', error);
    alert(error?.response?.data?.message || 'Failed to remove user.');
  }
};

export default handleRemoveUser;
