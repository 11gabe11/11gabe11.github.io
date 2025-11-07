// Initialize Supabase client
const supabase = createClient(
  "https://uzzcupnudyhvzdtwpjiw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6emN1cG51ZHlodnpkdHdwaml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODI3MTUsImV4cCI6MjA3ODA1ODcxNX0.ez6WS7tUemjAKr8fCyM2_WH4fNg6aoo7UoudFqmFd8E"
);

// signup example
async function signUp(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: displayName // will become display_name
      }
    }
  });

  if (error) {
    console.error("Signup failed:", error.message);
  } else {
    console.log("✅ User created", data.user);
  }
}
