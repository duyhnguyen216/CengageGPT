export async function fetchConstantValue(name) {
    const response = await fetch(`/api/env?name=${name}`);
    if (response.ok) {
      const { [name]: value } = await response.json();
      return value;
    } else {
      console.error(`Error fetching constant ${name}:`, response.statusText);
    }
  }
  