
// Public anon key is safe to use in browser ONLY with the supplied RLS policies enabled.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const SUPABASE_URL = "https://slkarylarnakepzzhewz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kGQgGAVrBKhjTv2z0pKt-A_JOUKBmmQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const eventId = params.get("event"), claimToken = params.get("claim");
let currentEvent = null, toastTimer;
const money = n => new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(n||0);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateFmt = d => new Date(d).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
const inviteLink = id => `${location.origin}${location.pathname}?event=${encodeURIComponent(id)}`;
function toast(s){const e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),3000)}
function show(v){["joinView","assignmentView","adminView"].forEach(id=>$(id).classList.toggle("hidden",id!==v));document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===(v==="adminView"?"admin":"join")))}
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view==="admin"?"adminView":"joinView"));
async function rpc(name,args){const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data}
async function loadEvent(){
  if(!eventId){$("eventNotice").textContent="No event link detected. Ask your organizer for the invitation link.";$("joinForm").classList.add("hidden");return}
  try{currentEvent=await rpc("get_event_public",{p_event_id:eventId});const closed=currentEvent.status!=="open"||Date.now()>new Date(currentEvent.deadline).getTime();$("eventNotice").innerHTML=`<b>${esc(currentEvent.name)}</b><br>Gift budget: ${money(currentEvent.budget)} · Registration closes: ${dateFmt(currentEvent.deadline)}<br>${closed?"Registration is closed.":"Registration is open — join before the deadline!"}`;if(closed)$("joinForm").classList.add("hidden")}
  catch(e){$("eventNotice").textContent=e.message||"Invalid event link.";$("joinForm").classList.add("hidden")}
}
$("joinForm").onsubmit=async e=>{
  e.preventDefault();const b=$("joinButton");b.disabled=true;b.textContent="Registering…";
  try{const data=await rpc("register_participant",{p_event_id:eventId,p_codename:$("codename").value.trim(),p_wishlist:$("wishlist").value.trim()});const link=`${location.origin}${location.pathname}?event=${encodeURIComponent(eventId)}&claim=${encodeURIComponent(data.access_token)}`;$("joinForm").classList.add("hidden");$("joinResult").classList.remove("hidden");$("joinResult").innerHTML=`<b>You're registered! 🎄</b><br>Save your private result link. You will use it to view your assignment after the organizer starts the shuffle.<p><a href="${link}">${link}</a></p><button class="btn secondary" id="copyPrivate">Copy my private link</button><p class="hint">Do not share this link. Anyone who has it may see your assignment.</p>`;$("copyPrivate").onclick=async()=>{await navigator.clipboard.writeText(link);toast("Private link copied.")}}
  catch(err){toast(err.message||"Registration failed.");b.disabled=false;b.textContent="Join the gift exchange →"}
};
async function loadAssignment(){
  show("assignmentView");$("assignmentResult").innerHTML='<p class="muted">Checking your private assignment…</p>';
  try{const a=await rpc("get_my_assignment",{p_event_id:eventId,p_access_token:claimToken});if(!a.ready){$("assignmentResult").innerHTML='<div class="notice">The organizer has not started the shuffle yet. Keep this private link and check again later.</div><button class="btn secondary" id="checkAgain">Check again</button>';$("checkAgain").onclick=loadAssignment;return}
    $("assignmentResult").innerHTML=`<div class="assignment-card"><small>YOU ARE GIVING A GIFT TO</small><div class="recipient">${esc(a.recipient_codename)}</div><div class="wish"><b>Wish list</b><br>${esc(a.recipient_wishlist).replace(/\n/g,"<br>")}</div></div><p class="hint" style="margin-top:14px">Keep your recipient a secret. Happy gifting!</p>`}
  catch(e){$("assignmentResult").innerHTML=`<div class="notice">${esc(e.message||"Could not retrieve assignment.")}</div>`}
}
$("loginForm").onsubmit=async e=>{e.preventDefault();$("loginError").textContent="";const {error}=await supabase.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});if(error)$("loginError").textContent=error.message};
$("logoutButton").onclick=()=>supabase.auth.signOut();
supabase.auth.onAuthStateChange((_event,session)=>{if(session)loadAdmin();else{$("adminLogin").classList.remove("hidden");$("adminDashboard").classList.add("hidden")}});
async function loadAdmin(){ $("adminLogin").classList.add("hidden");$("adminDashboard").classList.remove("hidden");if(!eventId){$("noEventBox").classList.remove("hidden");$("eventDashboard").classList.add("hidden");return}try{currentEvent=await rpc("get_event_public",{p_event_id:eventId});$("noEventBox").classList.add("hidden");$("eventDashboard").classList.remove("hidden");await refreshParticipants()}catch(e){$("adminMessage").textContent=e.message}}
$("eventForm").onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const d=new Date($("deadline").value);if(Number.isNaN(d.getTime()))throw Error("Enter a valid deadline.");const result=await rpc("create_event",{p_name:$("eventName").value.trim(),p_participant_limit:Number($("participantLimit").value),p_budget:Number($("giftBudget").value),p_deadline:d.toISOString()});location.href=`${location.pathname}?event=${result.event_id}#admin`}catch(err){toast(err.message||"Could not create event.");b.disabled=false}};
async function refreshParticipants(){
  const {data,error}=await supabase.from("participants").select("id,codename,wishlist,created_at").eq("event_id",eventId).order("created_at");if(error)throw error;
  $("registeredCount").textContent=data.length;$("capacityLabel").textContent=`of ${currentEvent.participant_limit} participants`;$("budgetLabel").textContent=money(currentEvent.budget);$("statusLabel").textContent=currentEvent.status==="drawn"?"Shuffled":currentEvent.status==="open"?"Open":"Closed";$("deadlineLabel").textContent=`Closes ${dateFmt(currentEvent.deadline)}`;$("inviteUrl").textContent=inviteLink(eventId);
  $("participantRows").innerHTML=data.map(p=>`<tr><td><b>${esc(p.codename)}</b></td><td class="wish-cell">${esc(p.wishlist)}</td><td>${dateFmt(p.created_at)}</td></tr>`).join("")||'<tr><td colspan="3">No participants yet.</td></tr>';
  $("shuffleButton").disabled=currentEvent.status!=="open"||data.length!==currentEvent.participant_limit;$("shuffleButton").textContent=currentEvent.status==="drawn"?"Shuffle completed":data.length!==currentEvent.participant_limit?`Need ${currentEvent.participant_limit-data.length} more participant(s)`:"🎲 Start secret shuffle";
}
$("refreshButton").onclick=()=>refreshParticipants().catch(e=>toast(e.message));
$("copyInvite").onclick=async()=>{await navigator.clipboard.writeText(inviteLink(eventId));toast("Invitation link copied.")};
$("shuffleButton").onclick=async()=>{if(!confirm("Start the secret shuffle now? It cannot be undone from this website."))return;$("shuffleButton").disabled=true;try{await rpc("shuffle_event",{p_event_id:eventId});toast("Shuffle completed! Participants can now view their private results.");await refreshParticipants()}catch(e){toast(e.message||"Shuffle failed.");await refreshParticipants()}};
if(claimToken)loadAssignment();else if(location.hash==="#admin")show("adminView");else loadEvent();
