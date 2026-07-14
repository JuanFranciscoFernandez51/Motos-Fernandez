import fs from "fs"
for (const l of fs.readFileSync(".env.local","utf8").split("\n")){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].replace(/^["']|["']$/g,"")}
const { prisma } = await import("@/lib/prisma")
const prod = await prisma.producto.findFirst({where:{activo:true,stock:{gt:0}},select:{id:true,nombre:true,precio:true,slug:true,categoriaId:true}})
const body={nombre:"Test",apellido:"Prueba",email:"test@motosfernandez.com.ar",telefono:"291",dni:"30000000",items:[{id:prod!.id,nombre:prod!.nombre,precio:prod!.precio,slug:prod!.slug,cantidad:1,categoriaId:prod!.categoriaId}]}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
let ok=false
for(let i=1;i<=15;i++){
  const r=await fetch("https://www.motosfernandez.com.ar/api/checkout/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
  const d:any=await r.json().catch(()=>({}))
  if(d.initPoint){console.log(`✅ intento ${i}: FUNCIONA! HTTP ${r.status}`);console.log("   initPoint:",d.initPoint.slice(0,80)+"…");ok=true;break}
  console.log(`intento ${i}: HTTP ${r.status} — todavía falla, espero 20s…`)
  await sleep(20000)
}
if(!ok) console.log("❌ Sigue fallando tras el deploy nuevo.")
const tp=await prisma.pedido.findMany({where:{email:"test@motosfernandez.com.ar"},select:{id:true}})
for(const p of tp){await prisma.pedidoItem.deleteMany({where:{pedidoId:p.id}}).catch(()=>{});await prisma.pedido.delete({where:{id:p.id}}).catch(()=>{})}
console.log("🧹 pedidos de prueba borrados:",tp.length)
await prisma.$disconnect()
