// Initialize Supabase client
const supabase = createClient(
  "https://YOURPROJECT.supabase.co",
  "YOUR-PUBLIC-ANON-KEY"
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
