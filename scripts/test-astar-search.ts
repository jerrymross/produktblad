import assert from "node:assert/strict";
import { discoverEducation, matchEducations, parseEducationDirectory } from "../lib/astar-search";

const course = (title="Utbilda dig till Kock i Norrköping", path="kock-norrkoping", school="Astar Norrköping", program="Komvux") => ({title,path,schools:[school],programs:[program]});
const query = {title:"Kock",school:"Norrköping",program:"Komvux"};
async function main(){
  assert.equal(matchEducations([course()],query)[0].exact,true);
  for(const wrong of [course(undefined,undefined,"Astar Umeå"),course(undefined,undefined,undefined,"Arbetsmarknadsutbildning"),course("Kock i språkkombination"),course(undefined,"kock-pabyggnad-norrkoping")])
    assert.equal(matchEducations([wrong],query).some(c=>c.exact),false);
  assert.equal(matchEducations([course("Kock","kock-boras","Astar Borås","Arbetsmarknadsutbildning")],{title:"Kock AF",school:"Borås",program:"AF"})[0].exact,true);
  assert.equal(matchEducations([course("Kock","kock-boras","Astar Borås","Arbetsmarknadsutbildning")],{title:"Kock",school:"Borås",program:"AF RUB"})[0].exact,false);
  assert.equal(matchEducations([course(),course(undefined,"kock-norrkoping-2")],query).filter(c=>c.exact).length,2);
  assert.deepEqual(matchEducations([course("Elektriker")],query),[]);
  assert.throws(()=>parseEducationDirectory("<html>Förändrad webbplats</html>"));
  const rows=[{title:"Utbilda dig till Kock i Norrköping",resource_detail:{hs_path:"kock-norrkoping",school:[{name:"Astar Norrköping"}],course_type:[{name:"Komvux"}]}}];
  const html=`<script>resources: ${JSON.stringify(rows)},\n filters: []</script>`;
  assert.equal(parseEducationDirectory(html).length,1);
  const calls:string[]=[];
  const mock:typeof fetch=async url=>{calls.push(String(url));return new Response(String(url).endsWith("/utbildning")?html:"<main><h1>Utbilda dig till Kock i Norrköping</h1><p>Du lär dig matlagning och hygien. Utbildningen ger praktisk träning i köket tillsammans med handledare.</p></main>",{headers:{"content-type":"text/html"}});};
  const result=await discoverEducation(query,mock);
  assert.equal(result.source?.url,"https://astar.se/utbildningar/kock-norrkoping");
  assert.equal(calls.length,2);
  calls.length=0;
  assert.equal((await discoverEducation({...query,school:"Umeå"},mock)).source,null);
  assert.equal(calls.length,1,"Ambiguous match must not fetch a course automatically");
  const changed=await discoverEducation(query,async url=>new Response(String(url).endsWith("/utbildning")?html:"<main><h1>Annan utbildning</h1><p>Denna sida gäller inte utbildningen som katalogen beskrev. Sidan kan ha bytt adress eller innehåll.</p></main>",{headers:{"content-type":"text/html"}}));
  assert.equal(changed.source,null,"Changed page title must require manual selection");
  if(process.argv.includes("--live")){
    for(const q of [query,{title:"Kock AF",school:"Borås",program:"AF"}]){
      const live=await discoverEducation(q);
      assert.ok(live.source,`Expected exact live match for ${q.school}`);
      console.log(JSON.stringify({query:q,source:live.source.url,characters:live.source.text.length}));
    }
  }
  console.log("OK: automatisk matchning, ort, utbildningstyp, namnvarianter, tvetydighet och källhämtning.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
