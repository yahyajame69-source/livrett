import Link from "next/link";
import BookMockup from "@/components/BookMockup";
import {createClient} from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
import ConstellationCanvas from "@/components/ConstellationCanvas";
import SecretAdminDot from "@/components/SecretAdminDot";

export default async function Home() {
 let products:any[]=[];
 try { const supabase=await createClient(); const {data}=await supabase.from("products").select("*").eq("is_available",true).order("created_at",{ascending:false}).limit(9); products=data||[]; } catch {}
 const demo = products;
 return <>
  <header className="topbar">
    <ConstellationCanvas variant="header" />
    <div className="wrap nav">
      <Link className="brand" href="/">Le Monde des Petits Livres</Link>
      <nav className="navlinks">
        <a href="#boutique">Boutique</a>
        <a href="#avantages">Notre univers</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>
  <main>
    <section className="hero">
      <ConstellationCanvas variant="hero" />
      <div className="wrap heroGrid">
        <div>
          <div className="eyebrow">Des livres pour rêver et apprendre</div>
          <h1>Ouvrez la porte à un monde merveilleux.</h1>
          <p>Des histoires captivantes et des livrets éducatifs imaginés pour éveiller la curiosité, nourrir l'imagination et accompagner les enfants dans leurs découvertes.</p>
          <a className="btn" href="#boutique">Découvrir la boutique　→</a>
        </div>
        <div className="heroArt"><BookMockup/></div>
      </div>
    </section>
    <section className="section" id="boutique"><div className="wrap"><div className="sectionHead"><div className="eyebrow">Notre sélection</div><h2>Des livres à découvrir</h2><p>Choisissez une histoire et faites entrer la magie à la maison.</p></div><div className="products">{demo.length ? demo.map((p:any)=><ProductCard key={p.id} product={p}/>) : <div className="panel" style={{gridColumn:"1 / -1",textAlign:"center"}}><h3>Notre collection arrive bientôt</h3><p className="muted">Les premiers livres seront présentés ici dès leur publication.</p></div>}</div></div></section>
    <section className="featureBand" id="avantages"><div className="wrap features"><div className="feature"><div style={{fontSize:32}}>📚</div><h3>Des histoires inspirantes</h3><p className="muted">Des univers conçus pour stimuler l'imagination.</p></div><div className="feature"><div style={{fontSize:32}}>✨</div><h3>Apprendre en s'amusant</h3><p className="muted">Des contenus adaptés aux jeunes lecteurs.</p></div><div className="feature"><div style={{fontSize:32}}>💬</div><h3>Commande facile</h3><p className="muted">Échangez directement avec nous sur WhatsApp.</p></div></div></section>
  </main>
  <footer className="footer" id="contact">
    <div className="wrap footerGrid">
      <div><div className="brand">Le Monde des Petits Livres</div><p>Des histoires merveilleuses, des enfants qui grandissent.</p></div>
      <div><strong>Contact et commandes</strong><p>Écrivez-nous sur WhatsApp pour commander votre livre.</p><a className="pill" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER||"25377531900"}`}>Nous contacter</a></div>
    </div>
    <SecretAdminDot />
  </footer>
 </>;
}