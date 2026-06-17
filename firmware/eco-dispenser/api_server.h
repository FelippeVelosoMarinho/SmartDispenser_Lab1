#ifndef API_SERVER_H
#define API_SERVER_H

#include <ESPAsyncWebServer.h>

void setupApiServer(AsyncWebServer& server);
void demoTick();
void startDemo();
bool isDemoRunning();
int  getDemoStep();

#endif