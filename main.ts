// TM1640 driver for micro:bit (MakeCode)
// MIT License

//% weight=90 color=#0EA5E9 icon="\uf26c"
//% block="TM1640"
namespace tm1640 {
    const TM1640_CMD1 = 0x40
    const TM1640_CMD2 = 0xC0
    const TM1640_CMD3 = 0x80
    const TM1640_DSP_ON = 0x08
    const TM1640_DELAY = 2

    const font: { [k: string]: number } = {
        '0': 0x3f, '1': 0x06, '2': 0x5b, '3': 0x4f, '4': 0x66,
        '5': 0x6d, '6': 0x7d, '7': 0x07, '8': 0x7f, '9': 0x6f,
        '-': 0x40, ' ': 0x00
    }

    // Глобальный дисплей для «простых» блоков
    let _disp: Display = null

    export class Display {
        private clk_p: DigitalPin
        private dio_p: DigitalPin
        private _brightness: number
        private gram: number[] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

        constructor(clk: DigitalPin, dio: DigitalPin, brightness: number) {
            this.clk_p = clk
            this.dio_p = dio
            this._brightness = Math.max(0, Math.min(7, brightness | 0))
            pins.digitalWritePin(this.clk_p, 0)
            pins.digitalWritePin(this.dio_p, 0)
            control.waitMicros(TM1640_DELAY)
            this._write_data_cmd()
            this._write_dsp_ctrl()
        }

        private dio(n: number) { pins.digitalWritePin(this.dio_p, n ? 1 : 0) }
        private clk(n: number) { pins.digitalWritePin(this.clk_p, n ? 1 : 0) }

        private _start() {
            this.dio(0); control.waitMicros(TM1640_DELAY)
            this.clk(0); control.waitMicros(TM1640_DELAY)
        }
        private _stop() {
            this.dio(0); control.waitMicros(TM1640_DELAY)
            this.clk(1); control.waitMicros(TM1640_DELAY)
            this.dio(1); control.waitMicros(TM1640_DELAY)
        }
        private _write_byte(b: number) {
            for (let i = 0; i < 8; i++) {
                this.dio((b >> i) & 1)
                control.waitMicros(TM1640_DELAY)
                this.clk(1)
                control.waitMicros(TM1640_DELAY)
                this.clk(0)
                control.waitMicros(TM1640_DELAY)
            }
        }
        private _write_data_cmd() {
            this._start(); this._write_byte(TM1640_CMD1); this._stop()
        }
        private _write_dsp_ctrl() {
            this._start(); this._write_byte(TM1640_CMD3 | TM1640_DSP_ON | this._brightness); this._stop()
        }
        private write(rows: number[], pos: number = 0) {
            if (pos < 0 || pos > 16) return
            this._write_data_cmd()
            this._start()
            this._write_byte(TM1640_CMD2 | pos)
            for (let r of rows) this._write_byte(r & 0xff)
            this._stop()
            this._write_dsp_ctrl()
        }
        private refresh() { this.write(this.gram, 0) }

        // -------- Блоки как методы объекта --------

        //% block="set brightness %value"
        //% value.shadow="number" value.min=0 value.max=7 value.defl=5
        //% weight=80
        setBrightness(value: number) {
            value = Math.max(0, Math.min(7, value | 0))
            this._brightness = value
            this._write_data_cmd()
            this._write_dsp_ctrl()
        }

        //% block="show integer %num"
        //% num.shadow="number"
        //% weight=70
        showInteger(num: number) {
            let s = (Math.floor(num)).toString()
            if (s.length > 4) s = s.slice(0, 4)
            let buf: number[] = []
            for (let ch of s) buf.push(font[ch] !== undefined ? font[ch] : 0x00)
            while (buf.length < 4) buf.unshift(0x00)
            for (let i = 0; i < 4; i++) this.gram[i] = buf[i]
            this.refresh()
        }

        //% block="show number %num with 1 decimal"
        //% num.shadow="number"
        //% weight=65
        showFloat1(num: number) {
            let n10 = Math.round(num * 10)
            let intPart = Math.idiv(n10, 10)
            let fracPart = Math.abs(n10 % 10)
            let s = intPart.toString() + "."
                + fracPart.toString()
            let buf: number[] = []
            for (let i = 0; i < s.length; i++) {
                let c = s.charAt(i)
                if (c == ".") {
                    if (buf.length > 0) buf[buf.length - 1] |= 0x80
                } else {
                    buf.push(font[c] !== undefined ? font[c] : 0x00)
                }
            }
            while (buf.length < 4) buf.unshift(0x00)
            buf = buf.slice(-4)
            for (let i = 0; i < 4; i++) this.gram[i] = buf[i]
            this.refresh()
        }
    }

    // -------- Простой режим: блоки без переменной --------

    /**
     * Создать/переинициализировать глобальный TM1640 для простых блоков
     */
    //% block="init TM1640 CLK %clk DIO %dio brightness %b"
    //% clk.defl=DigitalPin.P1 dio.defl=DigitalPin.P2 b.shadow="number" b.min=0 b.max=7 b.defl=5
    //% weight=90
    export function init(clk: DigitalPin, dio: DigitalPin, b: number = 5) {
        _disp = new Display(clk, dio, b)
    }

    //% block="TM1640 set brightness %value"
    //% value.shadow="number" value.min=0 value.max=7 value.defl=5
    //% weight=75
    export function setBrightness(value: number) {
        if (_disp) _disp.setBrightness(value)
    }

    //% block="TM1640 show integer %num"
    //% num.shadow="number"
    //% weight=70
    export function showInteger(num: number) {
        if (_disp) _disp.showInteger(num)
    }

    //% block="TM1640 show number %num with 1 decimal"
    //% num.shadow="number"
    //% weight=65
    export function showFloat1(num: number) {
        if (_disp) _disp.showFloat1(num)
    }

    /**
     * Создать новый объект и сохранить в переменную (объектный стиль)
     */
    //% block="TM1640 on CLK %clk DIO %dio brightness %b"
    //% clk.defl=DigitalPin.P1 dio.defl=DigitalPin.P2 b.shadow="number" b.min=0 b.max=7 b.defl=5
    //% weight=88 blockSetVariable=tm1640
    export function create(clk: DigitalPin, dio: DigitalPin, b: number = 5): Display {
        let d = new Display(clk, dio, b)
        _disp = d
        return d
    }
}
