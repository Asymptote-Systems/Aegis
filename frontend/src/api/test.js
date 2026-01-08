// helloService.js
import apiClient from "./apiClient"; // your pre-configured Axios instance

export async function testBackendConnection() {
  try {
    const response = await apiClient.get("/api/hello");
    return response.data; // { message: "Hello from FastAPI!" }
  } catch (error) {
    console.error("Error fetching hello message:", error);
    throw error;
  }
}
