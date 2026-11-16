/* TROZAL MOTION · deterministic scene, shot and interaction intelligence */
(function(root){
 'use strict';
 function splitBeats(brief){
  const normalized=String(brief||'').replace(/\r/g,'\n').replace(/[ \t]+/g,' ').trim();
  if(!normalized)return [];
  const lines=normalized.split(/\n+|(?<=[.!?;])\s+/).map(x=>x.trim()).filter(Boolean),beats=[];
  for(const line of lines){if(beats.length>=6){beats[5]+=' '+line;continue;}beats.push(line);}
  return beats;
 }
 function classify(line,index,total){
  const s=String(line||'').toLowerCase(),has=re=>re.test(s);
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
 function inferInteraction(line){
  const raw=String(line||'').trim();
  const patterns=[
   {type:'KONTAK / MANIPULASI',verbs:'pushes|pulls|grabs|holds|lifts|carries|throws|catches|opens|closes|moves|mendorong|menarik|meraih|memegang|mengangkat|membawa|melempar|menangkap|membuka|menutup|menggeser',cause:'aktor harus mendekati target, melakukan kontak yang terlihat, lalu target bergerak mengikuti titik kontak',effect:'target berubah posisi/orientasi; tangan atau alat tetap terhubung secara visual selama aksi'},
   {type:'TRANSFER / PEMBERIAN',verbs:'gives|hands|passes|hands over|receives|takes|memberikan|menyerahkan|mengoper|menerima|mengambil',cause:'tampilkan kedua pihak dan objek yang berpindah; kontak terjadi sebelum objek lepas dari pihak pertama',effect:'kepemilikan/posisi objek berpindah ke penerima; jangan membuat objek menghilang lalu muncul tanpa lintasan'},
   {type:'TATAPAN / PERHATIAN',verbs:'looks at|stares at|watches|points at|menatap|melihat|memperhatikan|menunjuk',cause:'arah kepala, mata, atau gestur aktor diarahkan tepat ke target',effect:'target menjadi pusat perhatian; gunakan eyeline match atau cut-in tanpa memindahkan posisi target'},
   {type:'PEMICU / AKTIVASI',verbs:'presses|switches on|activates|triggers|touches|menekan|menyalakan|mengaktifkan|memicu|menyentuh',cause:'tampilkan sentuhan/tekanan pada kontrol sebelum respons dimulai',effect:'lampu, mesin, panel, atau lingkungan baru bereaksi sesudah pemicu; tunjukkan jeda respons yang masuk akal'},
   {type:'BENTURAN / TABRAKAN',verbs:'hits|strikes|kicks|collides with|crashes into|bumps into|menabrak|memukul|menendang|bertabrakan dengan|menghantam',cause:'jaga lintasan kedua objek tetap terbaca dan perlihatkan titik kontak pada momen benturan',effect:'perubahan arah, deformasi, percikan, atau recoil hanya sesuai skala benturan; jangan mendahului kontak'},
   {type:'REAKSI / EMOSI',verbs:'reacts to|flinches|smiles at|laughs at|responds to|bereaksi terhadap|tersentak|tersenyum kepada|tertawa|merespons',cause:'reaksi dimulai setelah pemicu atau tindakan pihak lain terlihat',effect:'ekspresi dan pose berubah bertahap; pertahankan eyeline dan posisi relatif antar karakter'}
  ];
  for(const p of patterns){
   const re=new RegExp('(.{1,48}?)\\s+('+p.verbs+')\\s+(?:the\\s+|a\\s+|an\\s+|ke\\s+|kepada\\s+|pada\\s+)?(.{1,48})$','i');
   const m=raw.match(re);
   if(m)return {type:p.type,actor:m[1].replace(/^[,; ]+|[,; ]+$/g,''),verb:m[2],target:m[3].replace(/[.!?,;]+$/,'').trim(),cause:p.cause,effect:p.effect,confidence:'rule-based'};
  }
  if(/\b(with|bersama|antara|between)\b/i.test(raw))return {type:'RELASI SPASIAL',actor:'subjek yang disebut dalam brief',verb:'berinteraksi/berada bersama',target:'objek atau subjek terkait',cause:'pertahankan jarak, orientasi, dan urutan kedekatan yang dinyatakan brief',effect:'jangan mengubah relasi spasial tanpa aksi yang menjelaskannya',confidence:'contextual'};
  return null;
 }

 function inferMotion(line){
  const s=String(line||'').toLowerCase(),has=re=>re.test(s);
  const locomotion=has(/walk|run|sprint|jog|crawl|climb|swim|fly|soar|drive|ride|slide|roll|berlari|berjalan|melompat|merangkak|memanjat|berenang|terbang|meluncur|mengendarai/);
  const rotation=has(/turn|twist|spin|rotate|orbit|pivot|berputar|memutar|berotasi|berpaling/);
  const jump=has(/jump|leap|hop|bounce|melompat|meloncat|memantul/);
  const direction=has(/left|right|upward|downward|forward|backward|toward|away|clockwise|counterclockwise|kiri|kanan|atas|bawah|maju|mundur|mendekat|menjauh|searah jarum|berlawanan arah/);
  const limb=has(/arm|hand|leg|foot|head|shoulder|elbow|knee|tail|wing|lengan|tangan|kaki|kepala|bahu|siku|lutut|ekor|sayap/);
  const contact=has(/push|pull|grab|hold|lift|carry|throw|catch|hit|strike|kick|press|touch|open|close|mendorong|menarik|meraih|memegang|mengangkat|membawa|melempar|menangkap|memukul|menendang|menekan|menyentuh|membuka|menutup/);
  const pose=jump?'kompresi awal → tolakan → fase melayang → pendaratan dengan tekukan sendi dan settle':
   locomotion?'pose kontak dan pose ayun bergantian; pusat massa bergerak mengikuti lintasan, hindari kaki meluncur':
   rotation?'tetapkan pivot/poros terlebih dahulu; rotasikan tubuh atau objek terhadap poros itu tanpa drift pusat yang tidak diminta':
   contact?'siapkan pose antisipasi → titik kontak → follow-through → recoil/settle sesuai aksi':
   limb?'gerakkan sendi yang disebut secara berurutan; pertahankan hubungan anatomis dan hindari anggota tubuh terlepas':
   'gunakan pose awal yang stabil, satu perubahan pose yang terbaca, lalu pose akhir/hold; jangan menambahkan gestur yang tidak disebut';
  const path=direction?'ikuti arah yang eksplisit dalam brief dan pertahankan screen direction antar-frame':
   locomotion?'gunakan lintasan halus dan konsisten; tentukan titik awal, jalur, dan titik akhir':
   'jangan mengarang arah atau perpindahan posisi; pertahankan posisi dasar bila brief tidak menyebut gerak';
  const pivot=rotation?'pivot berada pada pusat sendi/objek yang logis dan konsisten':
   limb?'pivot pada sendi terkait (bahu, siku, pinggul, lutut, pergelangan)':
   'jaga anchor/pivot subjek stabil selama transformasi';
  const interaction=contact?'titik kontak harus terlihat; tangan/alat, target, dan gaya bergerak selaras; target baru bereaksi setelah kontak':
   'jangan menciptakan kontak fisik jika tidak dinyatakan';
  const environment=has(/dust|water|smoke|cloth|hair|grass|tree|rain|snow|debu|air|asap|kain|rambut|rumput|pohon|hujan|salju/)?
   'reaksi lingkungan mengikuti gaya/arah gerak (riak, partikel, deformasi, atau sway) dengan jeda dan intensitas proporsional':
   'lingkungan tetap stabil kecuali brief menyebut reaksi atau interaksi';
  return {pose,path,pivot,interaction,environment,locomotion,rotation,jump,limb};
 }
 function build(brief,duration){
  const beats=splitBeats(brief),seconds=Math.max(3,Math.min(60,Number(duration)||15));
  if(!beats.length)return 'Belum ada brief. Tulis subjek, aksi, lingkungan, dan perubahan adegan untuk melihat rencana.';
  const slot=seconds/beats.length,rows=[],relations=[];
  beats.forEach((line,index)=>{
   const plan=classify(line,index,beats.length),start=(index*slot).toFixed(1),end=(index===beats.length-1?seconds:(index+1)*slot).toFixed(1),relation=inferInteraction(line),motion=inferMotion(line);
   rows.push((index+1)+'. '+start+'–'+end+'s | '+plan.action+'\n   BRIEF: '+line+'\n   SHOT: '+plan.shot+'\n   KAMERA: '+plan.camera+'\n   STAGING: '+plan.staging);
   rows.push('   POSE & SIKLUS GERAK: '+motion.pose+'\\n   TRAJEKTORI: '+motion.path+'\\n   PIVOT / ANCHOR: '+motion.pivot+'\\n   KONTAK: '+motion.interaction+'\\n   RESPONS LINGKUNGAN: '+motion.environment);
   if(relation)relations.push((relations.length+1)+'. '+relation.type+' | AKTOR: '+relation.actor+' | AKSI: '+relation.verb+' | TARGET: '+relation.target+'\n   SEBAB / KONTAK: '+relation.cause+'\n   AKIBAT / RESPONS: '+relation.effect);
  });
  const interactionSection=relations.length?['GRAF INTERAKSI OBJEK (hubungan yang terdeteksi):',...relations,'URUTAN KAUSAL: pemicu/niat → pendekatan → kontak/aksi → reaksi target → keadaan akhir. Jangan tampilkan akibat sebelum penyebabnya.']:['GRAF INTERAKSI OBJEK: belum ada relasi aktor-target yang cukup eksplisit. Jangan mengarang interaksi; pertahankan aksi sesuai brief.'];
  return ['RINGKASAN: '+beats.length+' beat naratif · '+seconds+' detik · shot dan gerak kamera dipilih dari aksi pada tiap beat',...rows,...interactionSection,'KUNCI KONTINUITAS: pertahankan identitas, siluet, bentuk, warna, skala, arah gerak, dan posisi relatif subjek utama antar-beat kecuali brief menyebut perubahan.','KEDALAMAN: pisahkan foreground, midground, dan background; gunakan parallax hanya jika ada layer yang benar-benar berbeda jarak. Jaga subjek utama tetap terbaca dan tidak tertutup dekorasi.','LOGIKA KAMERA: satu motivasi kamera per beat. Jangan menggabungkan pan, zoom, orbit, dan shake secara acak. Gerakan kamera harus membantu aksi atau mengarahkan perhatian.','PACING: sisakan waktu untuk antisipasi, aksi, dan settle/hold; jangan memotong momen penemuan atau impact.','TRANSISI: hubungkan beat dengan arah gerak, komposisi, atau match cut yang konsisten; pergantian lokasi harus didukung brief.','BATAS KREATIF: jangan menambahkan tokoh, properti, lokasi, atau peristiwa baru yang tidak tersirat dalam brief.'].join('\n');
 }
 function mountPreview(){
  const prompt=document.getElementById('visualMotionPrompt'),duration=document.getElementById('visualMotionDuration'),panel=document.getElementById('trozalSceneUnderstandingPanel'),output=document.getElementById('trozalSceneUnderstandingOutput');
  if(!prompt||!duration||!panel||!output)return;
  const update=()=>{output.textContent=build(prompt.value,duration.value);};
  prompt.addEventListener('input',update);duration.addEventListener('change',update);update();
 }
 const api={splitBeats,classify,inferInteraction,inferMotion,build,mountPreview};root.TROZAL_SCENE_INTELLIGENCE=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPreview,{once:true});else mountPreview();}
})(typeof window!=='undefined'?window:globalThis);
