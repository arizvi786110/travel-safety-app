import { refreshSafetyScores } from "@/lib/jobs/refresh_safetyScores";
import { refreshPlaces } from "@/lib/jobs/refreshPlaces";

interface Env {}
export default{
    async scheduled (
        controller: ScheduledController,
        env: Env,
        ctx: ExecutionContext,
    ){
        switch(controller.cron){
            case "0 */4 * * *":
                await refreshSafetyScores();
                break;
            case "0 17 * * sun":
                await refreshPlaces();
                break;
        }
    },
} satisfies ExportedHandler <Env>