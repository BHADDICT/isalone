/* ISALONE — checkout.js
   Used by checkout.html: <script src="checkout.js"></script> */

/* =========================================================
   CART DATA
   The page reads the cart from localStorage key "isalone_cart".
   Have your product page's "Add to cart" save an array like:
   [{ id, name, price, size, color, qty, image }]
   If nothing is stored, the demo items below are shown.
   ========================================================= */
const CART_KEY = 'isalone_cart';
const DEMO_CART = [
  { id:'onyx-hoodie', name:'Onyx Oversized Fit Hoodie', price:39.99, size:'M', color:'Black', qty:1, image:'images/onyx-hoodie.jpg' },
  { id:'212-capri',   name:'212 Crest Oversized Fit Capri Sweatpants', price:41.99, size:'M', color:'Black', qty:1, image:'images/212-capri.jpg' }
];
const SHIPPING = [
  { id:'delivery', label:'Delivery', sub:'Anywhere in Cambodia', price:2.00 }
];
const FREE_SHIP_OVER = null;         // e.g. 100 = free delivery over $100; null = always charge
const PROMOS = { 'ISALONE10': 0.10 }; // demo codes; validate on your server for real

const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

let cart = store.get(CART_KEY);
if(!Array.isArray(cart)) cart = [];  // real cart from the shop page (DEMO_CART is no longer used)
let step = 0, shipId = 'delivery', discount = 0, info = {};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => '$' + n.toFixed(2);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb = i => `<div class="thumb"><img src="${esc(i.image||'')}" alt="" onerror="this.remove()"></div>`;

function totals(){
  const count = cart.reduce((a,i)=>a+i.qty,0);
  const sub = cart.reduce((a,i)=>a+i.price*i.qty,0);
  const disc = sub*discount;
  const ship = SHIPPING.find(s=>s.id===shipId);
  let shipCost = cart.length ? ship.price : null;   // flat delivery fee, shown from the start
  if(shipCost!==null && FREE_SHIP_OVER!==null && sub-disc >= FREE_SHIP_OVER) shipCost = 0;
  return { count, sub, disc, shipCost, total: sub - disc + (shipCost||0) };
}

function save(){ store.set(CART_KEY, cart); }

function renderBag(){
  const el = $('#bagRows');
  if(!cart.length){
    el.innerHTML = `<div class="empty caps">Your bag is empty<br><a href="pro.html">Continue shopping →</a></div>`;
    return;
  }
  el.innerHTML = cart.map((i,idx)=>`
    <div class="bag-row">
      ${thumb(i)}
      <div>
        <div class="caps item-brand">ISALONE</div>
        <div class="caps item-name">${esc(i.name)}</div>
        <div class="caps meta"><b>Size:</b> ${esc(i.size)}</div>
        <div class="caps meta"><b>Color:</b> ${esc(i.color)}</div>
        <div class="mobile-only caps">
          <div class="qty"><button data-dec="${idx}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-inc="${idx}" aria-label="Increase">+</button></div>
          <b>${money(i.price*i.qty)}</b>
        </div>
        <button class="remove caps" data-rm="${idx}">× Remove</button>
      </div>
      <div class="col-price">${money(i.price)}</div>
      <div class="col-qty"><div class="qty"><button data-dec="${idx}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-inc="${idx}" aria-label="Increase">+</button></div></div>
      <div class="col-total num">${money(i.price*i.qty)}</div>
    </div>`).join('');
}

function renderSummary(){
  const t = totals();
  $('#sumCount').textContent = t.count;
  $('#cartLink').textContent = `Cart ( ${t.count} )`;
  $('#sumItems').innerHTML = step === 0 ? '' : cart.map(i=>`
    <div class="sum-item">${thumb(i)}
      <div class="caps">${esc(i.name)}<small>${esc(i.size)} / ${esc(i.color)} · Qty ${i.qty}</small></div>
      <div>${money(i.price*i.qty)}</div>
    </div>`).join('');
  $('#sumSub').textContent = money(t.sub);
  $('#discLine').style.display = t.disc ? 'flex' : 'none';
  $('#sumDisc').textContent = '−' + money(t.disc);
  $('#sumShip').textContent = t.shipCost===null ? 'Calculated at checkout' : (t.shipCost===0 ? 'Free' : money(t.shipCost));
  $('#sumTotal').textContent = money(t.total);
  $('#mainAmt').textContent = money(t.total);
  $('#mainLabel').textContent = ['Checkout','Continue','Continue',"Done, I've paid"][step] || 'Checkout';
  $('#mainBtn').disabled = !cart.length || !$('#terms').checked;
  if(step===3) prepPayment();
}

function renderShip(){
  const sub = totals().sub;
  $('#shipOptions').innerHTML = SHIPPING.map(s=>{
    const free = FREE_SHIP_OVER!==null && sub>=FREE_SHIP_OVER;
    return `<label class="option ${s.id===shipId?'selected':''}">
      <input type="radio" name="ship" value="${s.id}" ${s.id===shipId?'checked':''}>
      <div class="grow"><div class="caps">${s.label}</div><div class="sub">${s.sub}</div></div>
      <div class="caps">${s.price===0||free?'Free':money(s.price)}</div></label>`;
  }).join('');
}

function renderReview(){
  const ship = SHIPPING.find(s=>s.id===shipId);
  const addr = [info.address, info.address2, info.province, 'Cambodia'].filter(Boolean).map(esc).join(', ');
  const rows = [
    ['Contact', esc(info.email||''), 1],
    ['Ship to', addr, 1]
  ];
  if(step===3) rows.push(['Method', `${ship.label} · ${ship.sub}`, 2]);
  const html = rows.map(r=>`<div class="review-row"><span class="k">${r[0]}</span><span style="text-transform:none;letter-spacing:0;font-size:13px">${r[1]}</span><button data-go="${r[2]}">Change</button></div>`).join('');
  $('#review2').innerHTML = html; $('#review3').innerHTML = html;
}

function go(n){
  if(n>0 && !cart.length) return;
  if(n>1 && !validInfo(false)) n = 1;
  step = n;
  $$('.panel').forEach(p=>p.classList.toggle('active', +p.dataset.panel===n));
  $$('#steps button').forEach(b=>{
    b.classList.toggle('active', +b.dataset.step===n);
    b.disabled = n===4;
  });
  if(n===2) renderShip();
  if(n>=2) renderReview();
  if(n===3) prepPayment();
  $('#summary').style.display = n===4 ? 'none' : '';
  $('#steps').style.display = n===4 ? 'none' : '';
  renderSummary();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- province (Phnom Penh by default, or type another) ---------- */
function province(){
  const sel = $('#province').value;
  return sel === '__other' ? $('#provinceOther').value.trim() : sel;
}
$('#province').addEventListener('change', e => {
  const other = e.target.value === '__other';
  $('#provinceOtherWrap').hidden = !other;
  if (other) $('#provinceOther').focus();
});

/* ---------- validation ---------- */
function check(id, ok){ const f=$('#'+id).closest('.field'); f.classList.toggle('invalid', !ok); return ok; }
function validInfo(show=true){
  const v = id => $('#'+id).value.trim();
  const tests = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')),
    phone: v('phone').replace(/\D/g,'').length >= 6,
    first: !!v('first'), last: !!v('last'), address: !!v('address'),
    province: !!province()
  };
  if(show){ Object.entries(tests).forEach(([k,ok])=>{ if(k!=='province') check(k,ok); });
    const other = $('#province').value==='__other'; check(other ? 'provinceOther' : 'province', tests.province); }
  const ok = Object.values(tests).every(Boolean);
  if(ok){ ['email','phone','first','last','address','address2'].forEach(k=>info[k]=v(k)); info.province = province(); info.country = 'Cambodia'; }
  return ok;
}
/* =========================================================
   ABA KHQR (simple, no server)
   Customer scans your static ABA QR, types the amount,
   presses "Done", and gets a receipt.
   ========================================================= */
let orderNo = null;

function prepPayment(){
  if(!orderNo) orderNo = 'IS' + Date.now().toString().slice(-6);
  const amt = money(totals().total);
  $('#qrAmount').textContent = amt;
  $('#qrAmount2').textContent = amt;
  $('#qrOrderNo').textContent = orderNo;
}

function finishOrder(){
  if(!$('#terms').checked){ toast('Please accept the terms first'); $('#terms').focus(); return; }
  const t = totals();
  const ship = SHIPPING.find(s=>s.id===shipId);
  const order = {
    orderNo, date: new Date().toISOString(), items: cart.map(i=>({...i})),
    subtotal: t.sub, discount: t.disc, shipping: t.shipCost||0, shippingMethod: ship.label,
    total: t.total, customer: {...info}, payment: 'ABA KHQR'
  };
  // Keep a copy in this browser (e.g. for an "order history" page later)
  const past = store.get('isalone_orders') || []; past.push(order); store.set('isalone_orders', past);
  notifyShop(order);   // email the order to ISALONE with a "Print receipt" link

  renderReceipt(order);
  go(4);
  cart = []; save();
  $('#cartLink').textContent = 'Cart ( 0 )';
}

/* =========================================================
   ORDER EMAIL TO THE SHOP (EmailJS) + PRINT LINK
   Uses the same EmailJS account as the waitlist.
   Create a 2nd template "New order" (see emailjs-order-template.html)
   and paste its Template ID below.
   ========================================================= */
const EMAILJS_PUBLIC_KEY   = "1uThHFmx4SJgzaxOh";
const EMAILJS_SERVICE_ID   = "service_yd2isl8";
const EMAILJS_ORDER_TEMPLATE_ID = "template_3xm1tyg";

function orderForPrint(o){
  const c = o.customer;
  return { n:o.orderNo, d:o.date, s:o.subtotal, x:o.discount, h:o.shipping, t:o.total,
    i:o.items.map(i=>[i.name, i.size, i.qty, i.price]),
    c:[`${c.first} ${c.last}`.trim(), c.phone, c.email, c.address, c.address2||'', c.province||''] };
}
function printLink(o){
  const json = JSON.stringify(orderForPrint(o));
  const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return new URL('print.html#' + b64, location.href).href;
}
function notifyShop(o){
  try{
    if (!window.emailjs || EMAILJS_ORDER_TEMPLATE_ID.startsWith('YOUR_')) { console.warn('Order email not set up yet'); return; }
    const c = o.customer;
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
      order_no: o.orderNo,
      order_date: new Date(o.date).toLocaleString('en-GB'),
      customer_name: `${c.first} ${c.last}`.trim(),
      customer_phone: c.phone, customer_email: c.email, reply_to: c.email,
      address: [c.address, c.address2, c.province, 'Cambodia'].filter(Boolean).join(', '),
      items: o.items.map(i=>`${i.name} / ${i.size} x${i.qty}  ${money(i.price*i.qty)}`).join('\n'),
      subtotal: money(o.subtotal), delivery: money(o.shipping), total: money(o.total),
      print_link: printLink(o)
    }, { publicKey: EMAILJS_PUBLIC_KEY }).catch(err => console.error('Order email failed', err));
  }catch(err){ console.error(err); }
}

function renderReceipt(o){
  $('#rcName').textContent = o.customer.first || '';
  $('#rcOrder').textContent = o.orderNo;
  $('#rcDate').textContent = new Date(o.date).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  $('#rcItems').innerHTML = o.items.map(i=>`
    <div class="rc-item">${thumb(i)}
      <div><div class="caps"><b>${esc(i.name)}</b></div><div class="caps rc-muted">${esc(i.size)} / ${esc(i.color)} · Qty ${i.qty}</div></div>
      <div>${money(i.price*i.qty)}</div>
    </div>`).join('');
  $('#rcTotals').innerHTML = `
    <div><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
    ${o.discount ? `<div><span>Discount</span><span>−${money(o.discount)}</span></div>` : ''}
    <div><span>Shipping (${esc(o.shippingMethod)})</span><span>${o.shipping ? money(o.shipping) : 'Free'}</span></div>
    <div class="rc-total"><span>Total paid</span><span>${money(o.total)}</span></div>`;
  const c = o.customer;
  $('#rcAddr').innerHTML = [`${esc(c.first)} ${esc(c.last)}`, esc(c.address), esc(c.address2||''), `${esc(c.province)}, Cambodia`, esc(c.phone), esc(c.email)].filter(s=>s.trim()).join('<br>');
}

/* ---------- events ---------- */
document.addEventListener('click', e=>{
  const t = e.target.closest('[data-inc],[data-dec],[data-rm],[data-go],[data-step]');
  if(!t) return;
  if(t.dataset.inc!==undefined){ cart[t.dataset.inc].qty++; }
  else if(t.dataset.dec!==undefined){ const i=cart[t.dataset.dec]; if(i.qty>1) i.qty--; }
  else if(t.dataset.rm!==undefined){ const [r]=cart.splice(t.dataset.rm,1); toast(`Removed — ${r.name} / ${r.size}`); }
  else if(t.dataset.go!==undefined){ go(+t.dataset.go); return; }
  else if(t.dataset.step!==undefined){ const n=+t.dataset.step; if(n<=step || (n<=2 && validInfo(false))) go(n); return; }
  save(); renderBag(); renderSummary();
});

$('#infoForm').addEventListener('submit', e=>{ e.preventDefault(); if(validInfo()) go(2); });
$('#infoForm').addEventListener('input', e=>{ const f=e.target.closest('.field'); if(f) f.classList.remove('invalid'); });

$('#shipOptions').addEventListener('change', e=>{ shipId=e.target.value; renderShip(); renderSummary(); });

$('#paidBtn').addEventListener('click', finishOrder);

$('#terms').addEventListener('change', renderSummary);

$('#promoBtn').addEventListener('click', ()=>{
  const code = $('#promoInput').value.trim().toUpperCase();
  if(PROMOS[code]){ discount = PROMOS[code]; $('#promoMsg').textContent = `${code} applied — ${PROMOS[code]*100}% off`; }
  else { discount = 0; $('#promoMsg').textContent = code ? 'Invalid code' : ''; }
  renderSummary();
});

$('#mainBtn').addEventListener('click', ()=>{
  if(step===0) return go(1);
  if(step===1){ if(validInfo()) go(2); return; }
  if(step===2) return go(3);
  if(step===3) finishOrder();
});

let toastT;
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2200); }

renderBag(); renderSummary();