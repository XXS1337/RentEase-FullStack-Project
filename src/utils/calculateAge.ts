// Function to calculate age based on a given birth date
const calculateAge = (birthDate: Date): number => {
  const birth = new Date(birthDate);
  const today = new Date();

  // Calculate the difference in years
  let age = today.getFullYear() - birth.getFullYear();

  // Check if the current month and day are before the birth month and day
  const monthDiff = today.getMonth() - birth.getMonth();

  // If the birthday has not yet occurred this year, subtract 1 from the age
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  // Return the calculated age
  return age;
};

export default calculateAge;
