import { supabase } from "@/lib/auth/supabase";

export async function verifySession(authHeader: string | undefined){
    if(!authHeader){
        return {user: null, error: "No authentication header provided"}
    }

    const token= authHeader.replace("Bearer ", "");
    const {data, error}= await supabase.auth.getUser(token);

    if(error || !data.user){
        return{ user:null, error: "Invalid or expired session"}
    }
    return {user:data.user, error:null};
}