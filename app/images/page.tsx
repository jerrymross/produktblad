import {pageIdentity,accessProfile} from '@/lib/access';
import {AppSidebar} from '@/components/AppSidebar';
import {ImageLibrary} from '@/components/images/ImageLibrary';
import {portalUrl} from '@/lib/app-path';

export default async function ImagesPage(){
  const user=await pageIdentity('/images');
  const profile=await accessProfile(user.id);
  if(!profile.admin&&!profile.schools.length)return <main className="login-page"><section className="login-card"><h1>Du är inloggad</h1><p>En Produktblad-administratör behöver tilldela dig en skola innan du kan använda bildbanken.</p><a href={portalUrl}>Till Astar Studio</a></section></main>;
  return <div className="workspace image-bank-workspace"><AppSidebar/><header className="app-header"><div className="header-center"><span className="header-kicker">ASTAR STUDIO / BILDBANK</span><span className="header-title">Bildbank</span></div><span className="local-badge">Gemensamt material</span></header><main className="image-bank-main"><h1>Utbildningsbilder</h1><p className="description">Välj en utbildning för att se dess bildvarianter. Här samlas bilderna som används i produktbladen.</p><ImageLibrary readOnly={!profile.admin}/></main></div>;
}
