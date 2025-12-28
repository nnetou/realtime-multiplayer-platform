<template>
  <div
    class="min-h-screen bg-[#1e8449] from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-4xl font-bold text-slate-900 tracking-tight">
          Distributed Application Development
        </h1>
        <p class="text-lg font-medium text-slate-900">Project - About Page</p>
      </div>

      <section class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div
          class="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4 shadow-lg p-6 flex flex-col w-full"
        >
          <h3 class="text-xl font-semibold text-white flex items-center gap-2">
            AUTHORS
          </h3>
        </div>
        <div
          class="bg-white rounded-lg shadow-lg border-2 p-6 flex flex-col w-full"
        >
          <p v-for="item in autors">
            <span class="text-lg font-medium text-slate-900">{{
              item.name
            }}</span>
            <span class="text-sm text-slate-500"> - {{ item.number }}</span>
          </p>
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div
          class="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 shadow-lg p-6 flex flex-col w-full"
        >
          <h3 class="text-xl font-semibold text-white flex items-center gap-2">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            REST API
          </h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between py-3">
            <span class="text-sm font-medium text-slate-600">API Status</span>
            <span
              :class="[
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
                api.connected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800',
              ]"
            >
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  api.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500',
                ]"
              ></span>
              {{ api.connected ? "Connected" : "Disconnected" }}
            </span>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div
          class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 shadow-lg p-6 flex flex-col w-full"
        >
          <h3 class="text-xl font-semibold text-white flex items-center gap-2">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
              />
            </svg>
            Web Socket
          </h3>
        </div>
        <div class="p-6 space-y-6">
          <div
            class="flex items-center justify-between py-3 border-b border-slate-100"
          >
            <span class="text-sm font-medium text-slate-600"
              >Connection Status</span
            >
            <span
              :class="[
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
                socket.connected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800',
              ]"
            >
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  socket.connected
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-red-500',
                ]"
              ></span>
              {{ socket.connected ? "Connected" : "Disconnected" }}
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <label
                for="message"
                class="block text-sm font-medium text-slate-700 mb-2"
              >
                Send Message
              </label>
              <div class="flex gap-3">
                <Input
                  id="message"
                  v-model="message"
                  type="text"
                  placeholder="Type your message..."
                  class="flex-1"
                />
                <Button type="button" @click="socket.emit('echo', message)">
                  Send
                </Button>
              </div>
            </div>

            <div
              v-if="received"
              class="bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <p class="text-xs font-medium text-slate-500 mb-1">
                Received Message:
              </p>
              <p class="text-slate-900 font-medium">{{ received }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ref, onMounted, inject } from "vue";

const apiBaseURL = inject("apiBaseURL");
const api = ref({ connected: false });
onMounted(async () => {
  try {
    const response = await fetch(`${apiBaseURL}/status`);
    if (response.status === 200) {
      api.value.connected = true;
    } else {
      api.value.connected = false;
    }
  } catch (error) {
    api.value.connected = false;
  }
});
const autors = ref([
  { name: "Ana Alves", number: "2230725" },
  { name: "Bruno Neto", number: "2221896" },
  { name: "Dinis Farrajota", number: "2230677" },
  { name: "José Tojeira", number: "2221865" },
]);

const socket = inject("socket");
const received = ref("");
const message = ref("Hello, WebSocket!");
socket.on("echo", (msg) => {
  received.value = msg;
});
</script>
