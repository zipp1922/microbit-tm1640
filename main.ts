//% color=#0EA5E9 icon="\uf26c" weight=90
//% block="TM1640"
//% groups='["Setup","Display"]'
namespace tm1640 {
    const CMD1 = 0x40, CMD2 = 0xC0, CMD3 = 0x80, DSP_ON = 0x08
    const DEL = 2
    const FONT: {[k:string]:number} = {
        "0":0x3f,"1":0x06,"2":0x5b,"3":0x4f,"4":0x66,
        "5":0x6d,"6":0x7d,"7":0x07,"8":0x7f,"9":0x6f,
        "-":0x40," ":0x00
    }

    // внутренний драйвер без блоков
    class Driver {
        constructor(private clk: DigitalPin, private dio: DigitalPin, private b: number) {
            if (this.b < 0) this.b = 0
            if (this.b > 7) this.b = 7
            pins.digitalWritePin(this.clk, 0)
            pins.digitalWritePin(this.dio, 0)
            control.waitMicros(DEL)
            this.dataCmd(); this.dspCtrl()
        }
        private D(n:number){ pins.digitalWritePin(this.dio, n?1:0) }
        private C(n:number){ pins.digitalWritePin(this.clk, n?1:0) }
        private start(){ this.D(0); control.waitMicros(DEL); this.C(0); control.waitMicros(DEL) }
        private stop(){ this.D(0); control.waitMicros(DEL); this.C(1); control.waitMicros(DEL); this.D(1); control.waitMicros(DEL) }
        private byte(b:number){
            for(let i=0;i<8;i++){
                this.D((b>>i)&1); control.waitMicros(DEL)
                this.C(1); control.waitMicros(DEL)
                this.C(0); control.waitMicros(DEL)
            }
        }
        private dataCmd(){ this.start(); this.byte(CMD1); this.stop() }
        private dspCtrl(){ this.start(); this.byte(CMD3|DSP_ON|this.b); this.stop() }
        write(rows:number[], pos:number=0){
            this.dataCmd()
            this.start(); this.byte(CMD2|pos)
            for (let r of rows) this.byte(r&0xff)
            this.stop(); this.dspCtrl()
        }
        setBrightness(v:number){ this.b = Math.min(7, Math.max(0, v|0)); this.dataCmd(); this.dspCtrl() }
    }

    // singleton как у StartbitV2
    let drv: Driver = null

    // ---------- БЛОКИ ----------
    /**
     * Инициализировать TM1640 (CLK/DIO/яркость)
     */
    //% blockId="tm1640_init"
    //% block="init TM1640 CLK %clk DIO %dio brightness %b"
    //% group="Setup" weight=90 blockGap=8
    //% clk.defl=DigitalPin.P1 dio.defl=DigitalPin.P2
    //% b.shadow="number" b.min=0 b.max=7 b.defl=5
    export function init(clk: DigitalPin, dio: DigitalPin, b: number = 5) {
        drv = new Driver(clk, dio, b)
    }

    /**
     * Установить яркость 0..7
     */
    //% blockId="tm1640_brightness"
    //% block="TM1640 set brightness %val"
    //% group="Setup" weight=80 blockGap=12
    //% val.shadow="number" val.min=0 val.max=7 val.defl=5
    export function setBrightness(val: number) {
        if (drv) drv.setBrightness(val)
    }

    /**
     * Показать целое число (до 4 разрядов)
     */
    //% blockId="tm1640_showInt"
    //% block="TM1640 show integer %num"
    //% group="Display" weight=70 blockGap=8
    //% num.shadow="number"
    export function showInteger(num: number) {
        if (!drv) return
        num = Math.floor(num)
        let s = num.toString()
        if (s.length > 4) s = s.slice(0, 4)
        let buf:number[]=[]
        for (let i=0;i<s.length;i++) buf.push(FONT[s.charAt(i)] || 0)
        while (buf.length<4) buf.unshift(0)
        drv.write(buf.slice(0,4),0)
    }

    /**
     * Показать число с 1 знаком после точки
     */
    //% blockId="tm1640_showFloat1"
    //% block="TM1640 show number %num with 1 decimal"
    //% group="Display" weight=60
    //% num.shadow="number"
    export function showFloat1(num: number) {
        if (!drv) return
        let n10 = Math.round(num * 10)
        let ip = Math.idiv(n10, 10)
        let fp = Math.abs(n10 % 10)
        // собираем сегменты: ip + точка + fp
        let s = ip.toString()
        let segs:number[]=[]
        for (let i=0;i<s.length;i++) segs.push(FONT[s.charAt(i)] || 0)
        if (segs.length==0) segs.push(0)
        segs[segs.length-1] |= 0x80
        segs.push(FONT[fp.toString()] || 0)
        while (segs.length<4) segs.unshift(0)
        drv.write(segs.slice(-4),0)
    }
}
