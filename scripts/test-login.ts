import { loginAction } from "@/modules/auth/actions";

async function testLogin() {
  // Create form data
  const formData = new FormData();
  formData.append("email", "superadmin@gmail.com");
  formData.append("password", "admin123");

  console.log("Testing login action...");
  const result = await loginAction(undefined, formData);
  console.log("Login result:", result);
}

testLogin().catch(console.error);