import {pageIdentity} from "@/lib/access";
import {EmbeddedReady} from "@/components/EmbeddedReady";
export default async function Ready(){await pageIdentity('/embed-ready');return <EmbeddedReady/>;}
