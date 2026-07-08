/* ============================
   RECURSOS
============================ */

#recursos{

    max-width:1200px;

    margin:auto;

    padding:100px 30px;

}

#recursos h2{

    text-align:center;

    font-size:48px;

    margin-bottom:70px;

}

.cards{

    display:grid;

    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));

    gap:30px;

}

.card{

    background:rgba(255,255,255,.05);

    backdrop-filter:blur(18px);

    border:1px solid rgba(255,255,255,.08);

    border-radius:24px;

    padding:40px 30px;

    text-align:center;

    transition:.35s;

    position:relative;

    overflow:hidden;

}

.card::before{

    content:"";

    position:absolute;

    width:150%;

    height:4px;

    background:#FFD000;

    top:0;

    left:-25%;

}

.card:hover{

    transform:translateY(-12px);

    box-shadow:0 25px 60px rgba(255,208,0,.18);

}

.card h3{

    margin:18px 0;

    font-size:24px;

}

.card p{

    color:#bfbfbf;

    line-height:1.7;

    font-size:16px;

}

/* ============================
   GALERIA
============================ */

.gallery{

    padding:100px 30px;

    max-width:1300px;

    margin:auto;

}

.gallery h2{

    text-align:center;

    font-size:48px;

    margin-bottom:60px;

}

.gallery-grid{

    display:grid;

    grid-template-columns:repeat(auto-fit,minmax(260px,1fr));

    gap:30px;

}

.gallery-grid img{

    width:100%;

    border-radius:24px;

    cursor:pointer;

    transition:.45s;

    box-shadow:0 10px 40px rgba(0,0,0,.45);

}

.gallery-grid img:hover{

    transform:scale(1.06);

    box-shadow:0 25px 70px rgba(255,208,0,.30);

}

/* ============================
   CTA
============================ */

.cta{

    margin:120px auto;

    max-width:1100px;

    padding:90px 40px;

    border-radius:35px;

    text-align:center;

    background:linear-gradient(135deg,#FFD000,#ffb300);

    color:#111;

}

.cta h2{

    font-size:52px;

    margin-bottom:20px;

}

.cta p{

    font-size:20px;

    margin-bottom:40px;

}

.cta .btn{

    background:#111;

    color:#FFD000;

}

.cta .btn:hover{

    background:#000;

}

/* ============================
   RODAPÉ
============================ */

footer{

    text-align:center;

    padding:60px 20px;

    border-top:1px solid rgba(255,255,255,.08);

}

footer h3{

    color:#FFD000;

    font-size:30px;

    margin-bottom:10px;

}

footer p{

    color:#9d9d9d;

}

/* ============================
   ANIMAÇÕES
============================ */

@keyframes subir{

    from{

        opacity:0;

        transform:translateY(50px);

    }

    to{

        opacity:1;

        transform:translateY(0);

    }

}

.hero,
.stats,
#recursos,
.gallery,
.cta{

    animation:subir .9s ease;

}

/* ============================
   RESPONSIVO
============================ */

@media(max-width:980px){

.hero{

flex-direction:column;

text-align:center;

padding-top:160px;

}

.hero h1{

font-size:46px;

}

.hero p{

font-size:18px;

}

.hero-phone img{

width:260px;

}

.stats{

grid-template-columns:1fr;

}

.buttons{

display:flex;

flex-direction:column;

gap:18px;

align-items:center;

}

.btn-outline{

margin-left:0;

}

#recursos h2,
.gallery h2,
.cta h2{

font-size:34px;

}

nav{

padding:15px 20px;

}

.logo{

font-size:24px;

}

.btn-nav{

padding:12px 24px;

}

}

@media(max-width:600px){

.hero h1{

font-size:36px;

}

.hero p{

font-size:16px;

}

.card{

padding:30px 20px;

}

.gallery-grid{

grid-template-columns:1fr;

}

.cta{

padding:60px 25px;

}

.cta h2{

font-size:30px;

}

}
// FAQ

document.querySelectorAll(".faq-item button").forEach(botao=>{

botao.onclick=()=>{

const conteudo=botao.nextElementSibling;

const aberto=conteudo.style.display==="block";

document.querySelectorAll(".faq-item div").forEach(div=>{

div.style.display="none";

});

conteudo.style.display=aberto?"none":"block";

}

});
