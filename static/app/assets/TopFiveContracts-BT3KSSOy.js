import{u as et,r as l,j as t}from"./react-vendor-gT-OydQZ.js";import{u as at,a as _,H as st,S as nt}from"./Header-DCBXWK7k.js";import{F as ot}from"./FilterPopup-BvoBd6-Q.js";import{I as G}from"./ThinkingPopup-DywD6nfH.js";import{f as rt}from"./currency-DWz4pj4s.js";import{h as it,E as lt}from"./jspdf-CzZ61QgE.js";import{R as ct}from"./refresh-cw-jVsfvclS.js";import"./createLucideIcon-in9Qc8Ri.js";import"./lottie-0OdDbsOy.js";const pt=`
@media print {
  /* Force print background colors and images */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  /* Hide non-essential UI elements only */
  aside, header, nav, .sidebar, .no-print {
    display: none !important;
  }
  
  /* Hide buttons but keep the card structure */
  button {
    display: none !important;
  }
  
  /* Hide rerun and sort buttons in print */
  .no-print-buttons {
    display: none !important;
  }
  
  /* Show the page title in print */
  .print-page-title {
    display: block !important;
    color: white !important;
    font-size: 1.5rem !important;
    font-weight: 700 !important;
    margin-bottom: 16px !important;
  }
  
  /* Make main content full width */
  main {
    padding: 10px !important;
    margin: 0 !important;
    width: 100% !important;
  }
  
  /* Keep the dark background for the page */
  body, html {
    background: #1C2B3A !important;
    background-color: #1C2B3A !important;
  }
  
  /* Style contract cards - preserve original dark design */
  .print-card {
    background: #2F3C4F !important;
    background-color: #2F3C4F !important;
    page-break-inside: avoid !important;
    margin-bottom: 16px !important;
    border: 1px solid white !important;
    border-radius: 16px !important;
    padding: 16px !important;
    position: relative !important;
  }
  
  /* Keep white text */
  .print-card h3,
  .print-card p,
  .print-card .text-white {
    color: white !important;
  }
  
  /* Keep trophy images visible */
  .print-card img {
    display: block !important;
  }
  
  /* Trophy container */
  .print-trophy-container {
    width: 120px !important;
    height: 120px !important;
    flex-shrink: 0 !important;
  }
  
  /* Keep label badges with white background */
  .print-card .inline-block {
    background: white !important;
    background-color: white !important;
    color: #2F3C4F !important;
    border-radius: 20px !important;
    padding: 4px 12px !important;
  }
  
  /* Match badge styling */
  .print-match-badge span {
    background: linear-gradient(to bottom, #6BB4B5, #6BA4A7) !important;
    color: white !important;
  }
  
  /* Grid layout for contract details */
  .print-card .grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
  }
  
  /* Flex containers */
  .print-card .flex {
    display: flex !important;
  }
  
  .print-card .flex-col {
    flex-direction: column !important;
  }
  
  /* Hide print-only title since we preserve original design */
  .print-title {
    display: none !important;
  }
  
  /* Ensure page breaks work properly */
  .space-y-4, .space-y-6 {
    display: block !important;
  }
  
  /* Scale down cards slightly to fit more on page */
  .print-card {
    transform: scale(0.95) !important;
    transform-origin: top left !important;
  }
}
`,dt="/static/app/dashboard/TrophyBackground.svg",mt="/static/app/dashboard/ContractSite.svg",ht="/static/app/dashboard/AskAI.svg",xt="/static/app/dashboard/Location.svg",gt="/static/app/dashboard/GeneratePDF.svg",Ft=()=>{const{t:s}=at(),u=et(),[b,N]=l.useState([]),[v,E]=l.useState(!0),[x,L]=l.useState(!1),[C,D]=l.useState(!1),[y,S]=l.useState(null),[q,I]=l.useState(!1),[g,R]=l.useState("all"),[w,H]=l.useState(["all"]),[V,k]=l.useState(!1),[F,A]=l.useState(0),[j,P]=l.useState(!1),[K,W]=l.useState(0),[T,O]=l.useState(!1),B=l.useRef(null);l.useEffect(()=>{const e=document.createElement("style");return e.id="top-five-print-styles",e.textContent=pt,document.head.appendChild(e),()=>{const r=document.getElementById("top-five-print-styles");r&&r.remove()}},[]),l.useEffect(()=>{!v&&y===!1&&u("/no-capability-statement?returnTo=/top-five-contracts")},[v,y,u]),l.useEffect(()=>{z()},[]);const z=async(e,r,p=0)=>{E(!0),k(!1);try{const a=await _.getTopFiveContracts(e,r,p);if(a.success){const i=(a.matches||[]).filter(n=>{const o=(n.Category||"").trim().toLowerCase();return o!=="unknown"&&o!==""}).map(n=>{let o=0;const c=n.Similarity_Score;return typeof c=="string"?o=parseFloat(c.replace("%",""))||0:typeof c=="number"&&(o=c>1?c:c*100),{rank:n.rank,state:n.State||"N/A",contractValue:n.Budget||"TBD",submissionDeadline:n.Due_Date||"N/A",naicsCode:n.NAICS_Code||"N/A",name:n.Bid_Name,contractingAgency:n.Organization||n.Company||"N/A",matchPercentage:Math.round(o),detailLink:n.Detail_Link}});N(i),S(a.has_matches),A(p),P(a.has_more||!1),W(a.total_available||0),a.has_matches&&i.length===0&&k(!0)}}catch(a){console.error("Failed to load top five contracts:",a),S(!1)}finally{E(!1)}},U=async()=>{if(!(!j||C)){D(!0);try{const e=F+5,r=await _.getTopFiveContracts(g!=="all"?g:void 0,w,e);if(r.success){const p=(r.matches||[]).filter(a=>{const i=(a.Category||"").trim().toLowerCase();return i!=="unknown"&&i!==""}).map(a=>{let i=0;const n=a.Similarity_Score;return typeof n=="string"?i=parseFloat(n.replace("%",""))||0:typeof n=="number"&&(i=n>1?n:n*100),{rank:a.rank,state:a.State||"N/A",contractValue:a.Budget||"TBD",submissionDeadline:a.Due_Date||"N/A",naicsCode:a.NAICS_Code||"N/A",name:a.Bid_Name,contractingAgency:a.Organization||a.Company||"N/A",matchPercentage:Math.round(i),detailLink:a.Detail_Link}});N(a=>[...a,...p]),A(e),P(r.has_more||!1)}}catch(e){console.error("Failed to load more contracts:",e)}finally{D(!1)}}},Y=["https://cookcountyil.bonfirehub.com","https://www.demandstar.com","https://www.bidnetdirect.com","https://vendors.planetbids.com","https://www.publicpurchase.com","https://iq.govwin.com","https://ha.internationaleprocurement.com","https://business.metro.net","https://smart.gep.com"],[$,J]=l.useState(null),[Q,f]=l.useState(!1),X=(e,r)=>{if(!e)return;Y.some(a=>e.startsWith(a))?(r&&r.preventDefault(),J(e),f(!0)):window.open(e,"_blank")},M=async(e,r)=>{L(!0),k(!1);try{const p=e&&e!=="all"&&e!==""?[e]:[],a=r||[],i=await _.rerunTopFiveMatching(p,a);if(i.success){const n=(i.matches||[]).filter(o=>{const c=(o.Category||"").trim().toLowerCase();return c!=="unknown"&&c!==""}).map(o=>{let c=0;const m=o.Similarity_Score;return typeof m=="string"?c=parseFloat(m.replace("%",""))||0:typeof m=="number"&&(c=m>1?m:m*100),{rank:o.rank,state:o.State||"N/A",contractValue:o.Budget||"TBD",submissionDeadline:o.Due_Date||"N/A",naicsCode:o.NAICS_Code||"N/A",name:o.Bid_Name,contractingAgency:o.Organization||o.Company||"N/A",matchPercentage:Math.round(c),detailLink:o.Detail_Link}});N(n),A(0),P(i.has_more||!1),W(i.total_available||n.length),n.length===0?k(!0):S(!0)}else console.error("Rerun matching failed:",i.error),alert(i.error||"Failed to refresh matches. Please try again.")}catch(p){console.error("Failed to rerun matching:",p),alert("Failed to refresh matches. Please try again.")}finally{L(!1)}},Z=(e,r)=>{R(e),H(r),M(e,r)},tt=async()=>{if(!(!B.current||b.length===0)){O(!0);try{const e=B.current,r=await it(e,{scale:2,useCORS:!0,allowTaint:!0,backgroundColor:"#1C2B3A",logging:!1,onclone:o=>{const c=o.querySelector("[data-pdf-container]");if(c){const d=o.createElement("h1");d.textContent=s("topFiveMatchesTitle"),d.style.cssText="color: white; font-family: Poppins, sans-serif; font-weight: 700; font-size: 24px; margin-bottom: 24px;",c.prepend(d)}o.querySelectorAll(".no-pdf").forEach(d=>{d.style.display="none"}),o.querySelectorAll(".font-poppins").forEach(d=>{const h=d;h.style.wordBreak="break-word",h.style.overflowWrap="break-word",h.style.lineHeight="1.3"}),o.querySelectorAll(".break-words").forEach(d=>{const h=d;h.style.wordBreak="break-word",h.style.overflowWrap="break-word",h.style.whiteSpace="normal"})}}),p=r.toDataURL("image/png"),a=r.width,i=r.height,n=new lt({orientation:a>i?"landscape":"portrait",unit:"px",format:[a/2,i/2]});n.addImage(p,"PNG",0,0,a/2,i/2),n.save("top-five-contracts.pdf")}catch(e){console.error("Failed to generate PDF:",e),alert("Failed to generate PDF. Please try again.")}finally{O(!1)}}};return t.jsxs("div",{className:"h-screen bg-corama-dark overflow-y-auto",children:[t.jsx(st,{}),t.jsxs("div",{className:"flex",children:[t.jsx("div",{className:"hidden lg:block absolute right-4 top-0 bottom-0 w-px","aria-hidden":"true",style:{backgroundColor:"rgb(45, 81, 112)",boxShadow:"rgba(45, 81, 112, 0.5) 0px 0px 8px"}}),t.jsx(nt,{}),t.jsx("div",{className:"flex-1 flex flex-col min-w-0",children:t.jsxs("main",{className:"flex-1 p-3 sm:p-4 lg:p-12 overflow-x-hidden",children:[t.jsx("h1",{className:"print-title hidden",children:"Top Contract Matches"}),t.jsxs("div",{className:"flex items-center justify-between mb-6 animate-fade-in",children:[t.jsx("h1",{className:"text-white font-poppins font-bold text-xl lg:text-2xl print-page-title",children:s("topFiveMatchesTitle")}),t.jsxs("div",{className:"flex items-center gap-3 no-print-buttons",children:[t.jsxs("button",{onClick:()=>M(g,w),disabled:x,className:"flex items-center gap-2 px-4 py-2 rounded-full text-white font-poppins text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50",style:{backgroundColor:"#6bb4b5"},children:[t.jsx(ct,{size:16,className:x?"animate-spin":""}),s(x?"rerunningMatching":"rerunMatching")]}),t.jsx("button",{onClick:()=>I(!0),className:"hover:opacity-90 transition-opacity",children:t.jsx("img",{src:xt,alt:"Filter",className:"h-6 w-6 lg:h-7 lg:w-7"})})]})]}),v||x||y===null?t.jsx("div",{className:"flex items-center justify-center h-64",children:x?t.jsx(G,{text:"Refreshing",size:"large"}):t.jsx(G,{text:"Loading",size:"large"})}):y===!1?t.jsx("div",{className:"flex items-center justify-center h-64",children:t.jsx("p",{className:"text-gray-400 font-poppins",children:s("loading")})}):V?t.jsxs("div",{className:"flex flex-col items-center justify-center h-64",children:[t.jsx("p",{className:"text-gray-400 font-poppins text-lg mb-4",children:s("noContractsMatchFilters")}),t.jsx("button",{onClick:()=>{R(""),H([]),z()},className:"px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white",style:{backgroundColor:"#6bb4b5"},children:s("clearFilters")})]}):b.length===0?t.jsxs("div",{className:"flex flex-col items-center justify-center h-64",children:[t.jsx("p",{className:"text-gray-400 font-poppins text-lg mb-4",children:s("noContractsToShow")}),t.jsx("button",{onClick:()=>M(g,w),className:"px-6 py-2 rounded-full font-poppins text-sm font-semibold text-white",style:{backgroundColor:"#6bb4b5"},children:s("rerunMatching")})]}):t.jsxs("div",{ref:B,"data-pdf-container":!0,className:"space-y-4 lg:space-y-6",children:[b.map(e=>{var r;return t.jsxs("div",{className:"print-card rounded-2xl p-4 sm:p-5 lg:p-6 relative border border-white",style:{backgroundColor:"#2F3C4F"},children:[t.jsx("h3",{className:"text-white font-poppins font-bold text-lg lg:text-xl mb-4",children:e.state}),t.jsx("div",{className:"absolute top-4 right-4 lg:top-6 lg:right-6 print-match-badge",children:t.jsx("span",{className:"font-poppins text-sm font-bold px-5 py-2 rounded-full text-white",style:{background:"radial-gradient(ellipse at 50% 150%, #6BB4B5 0%, #6BA4A7 100%)"},children:Number.isFinite(e.matchPercentage)?`${e.matchPercentage}% ${s("match")}`:s("matchPending")})}),t.jsxs("div",{className:"flex flex-col lg:flex-row items-start gap-4 lg:gap-6",children:[t.jsx("div",{className:"relative flex-shrink-0 print-trophy-container",style:{width:"160px",height:"160px"},children:t.jsxs("div",{className:"relative w-32 h-32 lg:w-36 lg:h-36",children:[t.jsx("img",{src:dt,alt:"",className:"absolute inset-0 w-full h-full"}),t.jsx("span",{className:"absolute left-1/2 top-[35%] transform -translate-x-1/2 -translate-y-1/2 text-3xl lg:text-4xl font-poppins font-bold text-white leading-none",children:e.rank})]})}),t.jsxs("div",{className:"flex-1 w-full",children:[t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-4",children:[t.jsxs("div",{children:[t.jsx("span",{className:"inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200",children:s("name")}),t.jsx("p",{className:"text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words",children:e.name})]}),t.jsxs("div",{children:[t.jsx("span",{className:"inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200",children:s("submissionDeadline")}),t.jsx("p",{className:"text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words",children:(r=e.submissionDeadline)==null?void 0:r.replace("T",`
`)})]}),t.jsxs("div",{children:[t.jsx("span",{className:"inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200",children:s("naicsCode")}),t.jsx("p",{className:"text-white font-poppins font-bold text-base lg:text-lg",children:e.naicsCode})]})]}),t.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6",children:[t.jsxs("div",{children:[t.jsx("span",{className:"inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200",children:s("contractValue")}),t.jsx("p",{className:"text-white font-poppins font-bold text-base lg:text-lg",children:rt(e.contractValue)})]}),t.jsxs("div",{children:[t.jsx("span",{className:"inline-block bg-white text-[#2F3C4F] font-poppins text-sm font-bold px-4 py-1.5 rounded-full mb-2 border border-gray-200",children:s("contractingAgency")}),t.jsx("p",{className:"text-white font-poppins font-bold text-base lg:text-lg whitespace-normal break-words",children:e.contractingAgency})]}),t.jsxs("div",{className:"flex flex-col gap-2 justify-start items-start",children:[t.jsxs("button",{onClick:p=>X(e.detailLink,p),className:"inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors",style:{background:"linear-gradient(180deg, #1C4262 6.25%, #284165 96%)"},children:[s("contractWebsite"),t.jsx("img",{src:mt,alt:"",className:"w-5 h-5"})]}),t.jsxs("button",{onClick:()=>{try{sessionStorage.setItem("lastContractDetailLink",e.detailLink||"")}catch{}u("/ai-assistant",{state:{contractName:e.name,contractAgency:e.contractingAgency,contractCategory:e.category,contractDetailLink:e.detailLink}})},className:"inline-flex items-center justify-center gap-3 text-white font-poppins text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-colors",style:{background:"linear-gradient(180deg, #1C4262 6.25%, #284165 96%)"},children:[s("askAiAboutThis"),t.jsx("img",{src:ht,alt:"",className:"w-6 h-5"})]})]})]})]})]})]},e.rank)}),t.jsxs("div",{className:"flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-6 lg:mt-8 no-print no-pdf",children:[t.jsxs("button",{className:"flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50",style:{backgroundColor:"rgb(28, 66, 98)"},onClick:tt,disabled:T,children:[t.jsxs("div",{className:"text-left",children:[t.jsx("p",{className:"font-bold text-sm sm:text-base",children:T?"Generating PDF...":s("downloadResults")}),t.jsx("p",{className:"text-xs sm:text-sm text-gray-300",children:T?"Please wait":s("downloadAsPdf")})]}),t.jsx("img",{src:gt,alt:"Print",className:"w-6 h-6"})]}),t.jsxs("button",{className:"flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white disabled:opacity-50",style:{backgroundColor:"rgb(28, 66, 98)"},onClick:U,disabled:!j||C,children:[t.jsxs("div",{className:"text-left",children:[t.jsx("p",{className:"font-bold text-sm sm:text-base",children:s(C?"loading":j?"loadMore":"noMoreContracts")}),t.jsx("p",{className:"text-xs sm:text-sm text-gray-300",children:j?`${s("showingContracts")} ${F+1}-${F+b.length} ${s("of")} ${K}`:s("allContractsLoaded")})]}),t.jsx("img",{src:"/static/app/dashboard/MoreContractsIcon.svg",alt:"More Contracts",className:"w-6 h-6"})]}),t.jsxs("button",{className:"flex items-center gap-3 text-white font-poppins px-4 sm:px-6 py-3 rounded-lg hover:opacity-90 transition-opacity border-2 border-white",style:{backgroundColor:"rgb(28, 66, 98)"},onClick:()=>u("/no-capability-statement?returnTo=/top-five-contracts"),children:[t.jsxs("div",{className:"text-left",children:[t.jsx("p",{className:"font-bold text-sm sm:text-base",children:s("changeCapabilityStatement")}),t.jsx("p",{className:"text-xs sm:text-sm text-gray-300",children:s("clickToUploadNewCS")})]}),t.jsx("img",{src:"/static/app/dashboard/CSIcon.svg",alt:"Capability Statement",className:"w-6 h-6"})]})]})]})]})})]}),Q&&t.jsxs("div",{className:"fixed inset-0 z-[100] flex items-center justify-center",children:[t.jsx("div",{className:"absolute inset-0 bg-black/60 backdrop-blur-sm",onClick:()=>f(!1)}),t.jsxs("div",{className:"relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 border border-white/20 animate-popup-pop",style:{backgroundColor:"rgb(11, 44, 72)",minHeight:"200px"},children:[t.jsx("button",{className:"absolute top-4 right-4 hover:opacity-80 transition-opacity",onClick:()=>f(!1),children:t.jsx("img",{src:"/static/app/proposal-summary/ClosePopupButton.svg",alt:"Close",className:"w-6 h-6"})}),t.jsx("div",{className:"flex-shrink-0",children:t.jsx("img",{src:"/static/app/proposal-summary/WarnIcon.svg",alt:"Warning",className:"w-16 h-16 sm:w-20 sm:h-20"})}),t.jsxs("div",{className:"flex flex-col gap-4 text-center sm:text-left",children:[t.jsxs("div",{children:[t.jsx("h3",{className:"text-white font-poppins font-bold text-lg sm:text-xl mb-1",children:"Third-Party Contract"}),t.jsx("p",{className:"text-gray-300 font-poppins text-xs sm:text-sm",children:"This contract is managed by a third-party provider. You will need to create an account on their site, where additional service fees may apply."})]}),t.jsxs("div",{className:"flex flex-col sm:flex-row gap-3",children:[t.jsx("button",{onClick:()=>{$&&window.open($,"_blank"),f(!1)},className:"px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity",style:{backgroundColor:"rgb(92, 191, 192)"},children:"Continue to Provider"}),t.jsx("button",{onClick:()=>f(!1),className:"px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity",style:{backgroundColor:"rgb(39, 69, 110)"},children:"Select Another Contract"})]})]})]})]}),t.jsx(ot,{isOpen:q,onClose:()=>I(!1),onApply:Z,contractType:g,states:w})]})};export{Ft as default};
