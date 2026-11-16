/* TROZAL MOTION · deterministic scene and shot intelligence */
(function(root){
 'use strict';
 function splitBeats(brief){
  const normalized=String(brief||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').trim();
  if(!normalized)return [];
  const lines=normalized.split(/\n+|(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean);
  const beats=[];
  for(const line of lines){if(beats.length>=6){beats[5]+=' '+line;continue;}beats.push(line);}
  return beats;
 }
 function classify(line,index,total){
  const s=String(line||'').toLowerCase();
  const has=(re)=>re.test(s);
  let action='AKSI UTAMA',shot='MEDIUM / WIDE SHOT',camera='gerak kamera halus mengikuti pusat aksi',staging='tampilkan pose awal, perubahan posisi, lalu pose akhir yang terbaca';
  if(has(/discover|finds?|reveals?|uncover|menemukan|menemui|terungkap|membuka|memperlihatkan|muncul/)){
   action='PENEMUAN / REVEAL';shot='CLOSE-UP lalu REVEAL';camera='slow push-in menuju objek penting, lalu tahan agar detail terbaca';staging='bangun antisipasi, tampilkan objek/hasil penemuan dengan jelas, beri jeda visual';
  }else if(has(/follow|chase|pursu|runs?|running|flies?|flying|drives?|rides?|moves? through|travels?|mengejar|mengikuti|berlari|terbang|melaju|mengendarai|bergerak melewati/)){
   action='PERGERAKAN / PERJALANAN';shot='WIDE SHOT atau PROFILE TRACKING';camera='tracking/pan searah gerak subjek; pertahankan ruang di depan arah perjalanannya';staging='jelaskan lintasan, arah masuk-keluar frame, kecepatan, dan reaksi lingkungan';
  }else if(has(/turns?|spins?|rotates?|orbits?|circles?|swirls?|berputar|mengitari|memutari/)){
   action='ROTASI / ORBIT';shot='MEDIUM SHOT dengan ruang sekeliling';camera='orbit kamera terkendali atau rotasi objek pada poros yang jelas';staging='pertahankan pusat rotasi dan siluet; jangan mencampur rotasi objek dengan orbit kamera tanpa alasan';
  }else if(has(/talks?|speaks?|explains?|presents?|shows?|berbicara|menjelaskan|menyampaikan|presentasi/)){
   action='KOMUNIKASI / PRESENTASI';shot='MEDIUM SHOT lalu CLOSE-UP detail';camera='kamera relatif stabil dengan push-in ringan pada momen penting';staging='arahkan gestur ke objek/audiens; jaga area aman untuk teks hanya bila diminta';
  }else if(has(/explodes?|crashes?|collides?|breaks?|falls?|impact|meledak|menabrak|bertabrakan|pecah|jatuh|hantaman/)){
   action='DAMPAK / PERUBAHAN MENDADAK';shot='WIDE SHOT untuk konteks, lalu DETAIL IMPACT';camera='tahan komposisi sebelum impact, beri aksen shake singkat hanya saat benturan';staging='bangun sebab, tampilkan momen impact, lalu tunjukkan akibatnya; hindari shake terus-menerus';
  }else if(has(/opens?|enters?|arrives?|emerges?|rises?|starts?|membuka|memasuki|tiba|muncul dari|terbit|naik/)){
   action='KEMUNCULAN / ESTABLISHING';shot='ESTABLISHING WIDE lalu MEDIUM';camera='slow dolly-in atau pan pembuka untuk memperkenalkan ruang dan subjek';staging='perlihatkan lokasi lebih dahulu, lalu subjek masuk dengan arah dan skala yang konsisten';
  }else if(has(/looks?|watches?|waits?|rests?|sleeps?|holds?|menatap|melihat|menunggu|beristirahat|tertidur|diam/)){
   action='REAKSI / HOLD';shot='CLOSE-UP atau MEDIUM HOLD';camera='kamera terkunci atau drift nyaris tak terasa; prioritaskan ekspresi/objek';staging='gunakan perubahan ekspresi, cahaya, atau detail kecil; jangan memaksakan gerakan besar';
  }
  if(index===0&&total>1&&action==='AKSI UTAMA'){shot='ESTABLISHING WIDE';camera='slow reveal untuk mengenalkan lokasi, skala, dan posisi subjek';}
  if(index===total-1&&has(/end|finally|lastly|concludes?|ends?|akhiri|akhirnya|menutup|berakhir/)){action='PENUTUP / HERO HOLD';shot='HERO SHOT atau WIDE HOLD';camera='settle perlahan lalu tahan komposisi akhir';}
  return {action,shot,camera,staging};
 }
 function build(brief,duration){
  const beats=splitBeats(brief),seconds=Math.max(3,Math.min(60,Number(duration)||15));
  if(!beats.length)return 'Belum ada brief. Tulis subjek, aksi, lingkungan, dan perubahan adegan untuk melihat rencana.';
  const slot=seconds/beats.length;
  const rows=beats.map((line,index)=>{
   const plan=classify(line,index,beats.length),start=(index*slot).toFixed(1),end=(index===beats.length-1?seconds:(index+1)*slot).toFixed(1);
   return (index+1)+'. '+start+'–'+end+'s | '+plan.action+'\n   BRIEF: '+line+'\n   SHOT: '+plan.shot+'\n   KAMERA: '+plan.camera+'\n   STAGING: '+plan.staging;
  });
  return ['RINGKASAN: '+beats.length+' beat naratif · '+seconds+' detik · shot dan gerak kamera dipilih dari aksi pada tiap beat',...rows,'KUNCI KONTINUITAS: pertahankan identitas, siluet, bentuk, warna, skala, arah gerak, dan posisi relatif subjek utama antar-beat kecuali brief menyebut perubahan.','KEDALAMAN: pisahkan foreground, midground, dan background; gunakan parallax hanya jika ada layer yang benar-benar berbeda jarak. Jaga subjek utama tetap terbaca dan tidak tertutup dekorasi.','LOGIKA KAMERA: satu motivasi kamera per beat. Jangan menggabungkan pan, zoom, orbit, dan shake secara acak. Gerakan kamera harus membantu aksi atau mengarahkan perhatian.','PACING: sisakan waktu untuk antisipasi, aksi, dan settle/hold; jangan memotong momen penemuan atau impact.','TRANSISI: hubungkan beat dengan arah gerak, komposisi, atau match cut yang konsisten; pergantian lokasi harus didukung brief.','BATAS KREATIF: jangan menambahkan tokoh, properti, lokasi, atau peristiwa baru yang tidak tersirat dalam brief.'].join('\n');
 }
 function mountPreview(){
  const prompt=document.getElementById('visualMotionPrompt'),duration=document.getElementById('visualMotionDuration'),panel=document.getElementById('trozalSceneUnderstandingPanel'),output=document.getElementById('trozalSceneUnderstandingOutput');
  if(!prompt||!duration||!panel||!output)return;
  const update=()=>{output.textContent=build(prompt.value,duration.value);};
  prompt.addEventListener('input',update);duration.addEventListener('change',update);update();
 }
 const api={splitBeats,classify,build,mountPreview};root.TROZAL_SCENE_INTELLIGENCE=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPreview,{once:true});else mountPreview();}
})(typeof window!=='undefined'?window:globalThis);
