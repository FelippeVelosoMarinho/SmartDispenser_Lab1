#ifndef HEARTBEAT_CLIENT_H
#define HEARTBEAT_CLIENT_H

#include <Arduino.h>

void setBackendUrl(const String& url);
void sendHeartbeat();
void requestEarlyHeartbeat();
bool consumeEarlyHeartbeat();

#endif
