const ex=(w,o,s)=>(w>>>o)&((1<<s)-1);
for (const inst of [0x5C0D0002,0x01290682,0x01290783,0x01290882,0x01290983]) {
  console.log('inst', inst.toString(16), {opcode: ex(inst,26,6), funct: ex(inst,0,6), shamt: ex(inst,6,5), rs: ex(inst,21,5), rt: ex(inst,16,5), rd: ex(inst,11,5)});
}
