# TM1640 for micro:bit

Bit-banged driver for TM1640 4-digit/LED modules.

## Usage

```blocks
let tm = tm1640.create(DigitalPin.P1, DigitalPin.P2, 5)
tm.showInteger(1234)
tm.showFloat1(-12.3)
tm.setBrightness(7)
