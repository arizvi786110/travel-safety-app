import { supabase } from "@/lib/auth/supabase";
import { getPlaces } from "@/lib/data-sources/places";
 export async function refreshPlaces(){
    const {data:locations, error}= await supabase.from('places')
    .select('*')
    const now= new Date();;
    const refreshed_interval=  14400000;;
    if (!locations) return;
    for(const location of locations){
        let lastUpdated= new Date(location.last_updated);
        let elapsed= now.getTime()- lastUpdated.getTime();
        if (elapsed > refreshed_interval){
            const newPlacesData= await getPlaces(location.latitude, location.longitude, location.radius, location.type_activity,location.maxResultCount);
            const {data: updatResult, error:updateError}= await supabase.from('places')
            .update({name:newPlacesData.name, type_activity:newPlacesData.type_activity, last_updated:now})
            .eq('latitude', location.latitude)
            .eq('logitude', location.longitude)
            .eq('radius', 'location.radius')
    }
}
}