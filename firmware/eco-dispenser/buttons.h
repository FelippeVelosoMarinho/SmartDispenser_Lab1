#ifndef BUTTONS_H
#define BUTTONS_H

void buttonsSetup();
void checkButtons();       // chamar no loop()
int  getLastConfirmedSlot();
void resetLastConfirmedSlot();

#endif