import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://gxairwbxztlzhveiqmyn.supabase.co";

// Replace this placeholder with your Publishable key
// from Supabase → Project Settings → API Keys.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xroE0RUUZDlsdfeoOaTuxg_3GXxOIEz";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);