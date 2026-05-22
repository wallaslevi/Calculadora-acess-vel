'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  Eye, 
  History, 
  Trash2, 
  Keyboard, 
  Smartphone
} from 'lucide-react';

// Spoken mapping in Brazilian Portuguese for "Voz Ativa" profile
const VOCAL_DIC: Record<string, string> = {
  "0": "Zero",
  "1": "Um",
  "2": "Dois",
  "3": "Três",
  "4": "Quatro",
  "5": "Cinco",
  "6": "Seis",
  "7": "Sete",
  "8": "Oito",
  "9": "Nove",
  "+": "Mais",
  "-": "Menos",
  "*": "Vezes",
  "/": "Dividido por",
  ",": "Vírgula",
  ".": "Vírgula",
  "C": "Limpar Tudo",
  "Backspace": "Apagar",
  "=": "Igual a"
};

export default function AccessibilityCalculatorPage() {
  const [isClient, setIsClient] = useState(false);
  const [currentInput, setCurrentInput] = useState<string>("0");
  const [storedInput, setStoredInput] = useState<string>("");
  const [mathOperator, setMathOperator] = useState<string>("");
  const [shouldResetInput, setShouldResetInput] = useState<boolean>(false);
  const [activeProfile, setActiveProfile] = useState<'standard' | 'vocal' | 'contrast'>('standard');
  const [calculatedHistory, setCalculatedHistory] = useState<string[]>([]);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // Client-side initialization guard (deferred to comply with ESLint set-state-in-effect rules)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Audio speech synthesis helper in pt-BR
  const speak = (text: string) => {
    if (activeProfile !== 'vocal') return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis unavailable or blocked by iframe security:", err);
    }
  };

  // Keyboard feedback animation triggers
  const triggerKeyPressFeedback = (key: string) => {
    setLastKeyPressed(key);
    setTimeout(() => {
      setLastKeyPressed(null);
    }, 150);
  };

  // Convert decimal representation of commas for Brazilian standard (placed first or hoisted)
  function formatValue(valStr: string) {
    if (valStr === "Erro" || valStr === "NaN" || valStr === "Infinity") return valStr;
    const parts = valStr.split('.');
    let integerPart = parts[0];
    let decimalPart = parts.length > 1 ? parts[1] : '';

    let outcomeStr = "";
    let count = 0;
    for (let i = integerPart.length - 1; i >= 0; i--) {
      if (integerPart[i] === '-') {
        outcomeStr = '-' + outcomeStr;
        continue;
      }
      outcomeStr = integerPart[i] + outcomeStr;
      count++;
      if (count % 3 === 0 && i > 0 && integerPart[i - 1] !== '-') {
        outcomeStr = '.' + outcomeStr;
      }
    }

    if (parts.length > 1) {
      return outcomeStr + ',' + decimalPart;
    }
    return outcomeStr;
  }

  function appendDigit(digit: string) {
    if (currentInput === "0" || shouldResetInput) {
      setCurrentInput(digit);
      setShouldResetInput(false);
    } else {
      if (currentInput.replace(/[.,]/g, '').length < 15) {
        setCurrentInput(prev => prev + digit);
      }
    }
  }

  function appendComma() {
    if (shouldResetInput) {
      setCurrentInput("0.");
      setShouldResetInput(false);
      return;
    }
    if (!currentInput.includes('.')) {
      setCurrentInput(prev => prev + '.');
    }
  }

  function setOperator(op: string) {
    if (mathOperator && !shouldResetInput) {
      // Evaluate first for running chain
      calculateResult();
    }
    setStoredInput(currentInput);
    setMathOperator(op);
    setShouldResetInput(true);
  }

  function handleBackspace() {
    if (shouldResetInput) {
      setCurrentInput("0");
      return;
    }
    if (currentInput.length > 1) {
      const updated = currentInput.slice(0, -1);
      if (updated === "-" || updated === "") {
        setCurrentInput("0");
      } else {
        setCurrentInput(updated);
      }
    } else {
      setCurrentInput("0");
    }
  }

  function clearCalculator() {
    setCurrentInput("0");
    setStoredInput("");
    setMathOperator("");
    setShouldResetInput(false);
  }

  function calculateResult() {
    if (!mathOperator || storedInput === "") return;

    const num1 = parseFloat(storedInput);
    const num2 = parseFloat(currentInput);
    let resultValue: number | string = 0;

    if (isNaN(num1) || isNaN(num2)) return;

    switch (mathOperator) {
      case '+':
        resultValue = num1 + num2;
        break;
      case '-':
        resultValue = num1 - num2;
        break;
      case '*':
        resultValue = num1 * num2;
        break;
      case '/':
        if (num2 === 0) {
          resultValue = "Erro";
        } else {
          resultValue = num1 / num2;
        }
        break;
      default:
        return;
    }

    let finalVal = String(resultValue);

    // Round logic for precision decimals
    if (typeof resultValue === 'number' && !Number.isInteger(resultValue)) {
      const precisionStr = parseFloat(resultValue.toFixed(8)).toString();
      finalVal = precisionStr;
    }

    const readableOp = mathOperator === '*' ? '×' : (mathOperator === '/' ? '÷' : mathOperator);
    const formulaString = `${formatValue(storedInput)} ${readableOp} ${formatValue(currentInput)} = ${formatValue(finalVal)}`;

    // Set lists logs
    setCalculatedHistory(prev => {
      const updated = [formulaString, ...prev];
      return updated.slice(0, 10);
    });

    // Speak action in Vocal profile
    if (activeProfile === 'vocal') {
      if (resultValue === "Erro") {
        speak("Erro, divisão por zero!");
      } else {
        const vocalTxt = String(finalVal).replace('.', ' vírgula ');
        speak(`Igual a ${vocalTxt}`);
      }
    }

    setCurrentInput(finalVal);
    setMathOperator("");
    setStoredInput("");
    setShouldResetInput(true);
  }

  function handleAction(key: string) {
    triggerKeyPressFeedback(key);

    // Audio narration
    if (activeProfile === 'vocal') {
      const translatedWord = VOCAL_DIC[key] || key;
      speak(translatedWord);
    }

    if (key >= '0' && key <= '9') {
      appendDigit(key);
    } else if (key === ',' || key === '.') {
      appendComma();
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      setOperator(key);
    } else if (key === '=' || key === 'Enter') {
      calculateResult();
    } else if (key === 'C' || key === 'c' || key === 'Escape') {
      clearCalculator();
    } else if (key === 'Backspace') {
      handleBackspace();
    }
  }

  // Keyboard accessibility listeners (placed here now that handleAction is declared style)
  useEffect(() => {
    if (!isClient) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const allowedKeys = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        '+', '-', '*', '/', '=', 'Enter', 'Escape', 'Backspace', '.', ',', 'c', 'C'
      ];

      if (allowedKeys.includes(e.key)) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault(); // Stop standard screen scrolling
        }
        handleAction(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, currentInput, storedInput, mathOperator, shouldResetInput, activeProfile]);

  // Profile switches
  const selectProfile = (profile: 'standard' | 'vocal' | 'contrast') => {
    setActiveProfile(profile);
    if (profile === 'standard') {
      speak("Perfil de calculadora padrão ativado.");
    } else if (profile === 'vocal') {
      // Must double run speak trigger
      setTimeout(() => {
        speak("Perfil voz ativa ativado. Operações e teclas faladas habilitadas em português.");
      }, 50);
    } else if (profile === 'contrast') {
      speak("Perfil alto contraste ativado. Fontes gigantes e cores de alta visibilidade.");
    }
  };

  const copyHTMLToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      const codeString = getEmbeddableHTML();
      navigator.clipboard.writeText(codeString);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      speak("Código do arquivo autocontido copiado com sucesso.");
    }
  };

  const downloadHTMLFile = () => {
    const codeString = getEmbeddableHTML();
    const blob = new Blob([codeString], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'index.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    speak("Iniciando o download do arquivo de código.");
  };

  // Safe getter for single-file HTML version
  const getEmbeddableHTML = () => {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculadora Acessível LPS v1.0</title>
  <!-- Tailwind CSS v3 CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    .font-mono-val {
      font-family: 'JetBrains Mono', monospace;
    }
    button:focus-visible {
      outline: 4px solid #facc15;
      outline-offset: 2px;
    }
    .transition-all-custom {
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
  </style>
</head>
<body id="body-container" class="bg-slate-50 text-slate-800 min-h-screen flex flex-col justify-between transition-all-custom">

  <!-- Top Decorative Header -->
  <header class="w-full max-w-lg mx-auto px-4 pt-6">
    <div class="flex items-center justify-between border-b border-slate-200 pb-3" id="header-border">
      <div class="flex flex-col">
        <span class="text-[10px] uppercase tracking-widest text-slate-400 font-bold" id="badge-lps">Linha de Produtos v1.0</span>
        <h1 class="text-xl font-extrabold text-slate-800 tracking-tight" id="header-title">Calculadora Acessível</h1>
      </div>
      <div class="flex items-center space-x-1.5" id="header-indicator">
        <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-semibold text-slate-500" id="status-label">Sistema Pronto</span>
      </div>
    </div>
  </header>

  <!-- Main Content Space -->
  <main class="flex-grow flex items-center justify-center p-4">
    <div id="calculator-card" class="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all-custom">
      
      <!-- Accessibility Profile Selector (Gestão de Variabilidade) -->
      <div id="profile-container" class="bg-slate-100 p-2.5 flex space-x-1 border-b border-slate-100">
        <!-- Perfil Padrão -->
        <button id="profile-standard" onclick="setProfile('standard')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all-custom text-slate-800 bg-white shadow-sm flex flex-col items-center justify-center gap-1 focus:outline-none" role="tab" aria-selected="true" title="Perfil Padrão: Calculadora comum e silenciosa">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
          <span>Padrão</span>
        </button>

        <!-- Perfil Voz Ativa -->
        <button id="profile-vocal" onclick="setProfile('vocal')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all-custom text-slate-500 hover:text-slate-800 flex flex-col items-center justify-center gap-1 focus:outline-none" role="tab" aria-selected="false" title="Perfil Voz Ativa: Fala teclado e operação">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
          <span>Voz Ativa</span>
        </button>

        <!-- Perfil Alto Contraste -->
        <button id="profile-contrast" onclick="setProfile('contrast')" class="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all-custom text-slate-500 hover:text-slate-800 flex flex-col items-center justify-center gap-1 focus:outline-none" role="tab" aria-selected="false" title="Perfil Alto Contraste: Fundo escuro e fontes robustas">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18h.008v.008H12V3Zm0 18h.008v.008H12V21Zm0-15h.008v.008H12V6Zm0 12h.008v.008H12V18Zm0-6h.008v.008H12V12Zm6.634 3.366h.008v.008h-.008v-.008Zm0-6.732h.008v.008h-.008v-.008ZM5.366 15.366h.008v.008h-.008v-.008Zm0-6.732h.008v.008h-.008v-.008Zm11.268 9.1a9 9 0 1 1-11.268-11.268A9 9 0 0 1 16.634 17.734Z" /></svg>
          <span>Contraste</span>
        </button>
      </div>

      <!-- Displays Container (Expression and outcomes) -->
      <div id="calculator-display" class="bg-slate-900 text-white p-6 md:p-8 text-right flex flex-col justify-end min-h-[140px] transition-all-custom border-b border-slate-800 relative">
        <div id="accessibility-hud" class="absolute left-4 top-4 text-[10px] font-mono uppercase text-sky-400 font-bold bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/20">
          Modo Silencioso
        </div>
        
        <!-- Equation Preview in real time -->
        <div id="expression-view" class="text-slate-400 text-sm font-medium tracking-wide mb-1 font-mono-val h-6 overflow-hidden break-all" aria-hidden="true"></div>

        <!-- Primary Readout -->
        <input id="input-view" type="text" class="bg-transparent text-right text-4xl md:text-5xl font-bold text-white font-mono-val placeholder-slate-700 w-full focus:outline-none border-none p-0 select-all" value="0" readonly aria-live="polite" aria-label="Resultado da calculadora">
      </div>

      <!-- Main Command Grid -->
      <div id="calculator-buttons" class="p-6 md:p-8 bg-slate-50/50 grid grid-cols-4 gap-3.5 transition-all-custom" role="region" aria-label="Teclado da Calculadora">
        <!-- Linha 1 -->
        <button id="btn-clear" onclick="pressKey('C')" class="col-span-2 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center gap-1 focus:outline-none">
          Limpar
        </button>
        <button id="btn-back" onclick="pressKey('Backspace')" class="py-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Apagar último caractere">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.363a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z" /></svg>
        </button>
        <button id="btn-div" onclick="pressKey('/')" class="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Dividido por">
          ÷
        </button>

        <!-- Linha 2 -->
        <button id="btn-7" onclick="pressKey('7')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">7</button>
        <button id="btn-8" onclick="pressKey('8')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">8</button>
        <button id="btn-9" onclick="pressKey('9')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">9</button>
        <button id="btn-mul" onclick="pressKey('*')" class="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Multiplicado por">×</button>

        <!-- Linha 3 -->
        <button id="btn-4" onclick="pressKey('4')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">4</button>
        <button id="btn-5" onclick="pressKey('5')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">5</button>
        <button id="btn-6" onclick="pressKey('6')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">6</button>
        <button id="btn-sub" onclick="pressKey('-')" class="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Menos">−</button>

        <!-- Linha 4 -->
        <button id="btn-1" onclick="pressKey('1')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">1</button>
        <button id="btn-2" onclick="pressKey('2')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">2</button>
        <button id="btn-3" onclick="pressKey('3')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">3</button>
        <button id="btn-add" onclick="pressKey('+')" class="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Mais">+</button>

        <!-- Linha 5 -->
        <button id="btn-0" onclick="pressKey('0')" class="col-span-2 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none">0</button>
        <button id="btn-comma" onclick="pressKey(',')" class="py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Vírgula">,</button>
        <button id="btn-equal" onclick="pressKey('=')" class="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none" aria-label="Igual ao resultado">=</button>
      </div>

      <!-- History Activity Log -->
      <div id="drawer-history" class="p-4 bg-slate-100/70 border-t border-slate-100">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1" id="history-label">
            <svg class="w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            Histórico Recente
          </span>
          <button id="btn-clear-history" onclick="clearHistory()" class="text-[10px] text-slate-400 hover:text-rose-500 font-semibold uppercase hover:underline cursor-pointer focus:outline-none">
            Limpar
          </button>
        </div>
        <div id="history-list" class="max-h-24 overflow-y-auto space-y-1 text-xs text-slate-600 pr-1 select-all font-mono-val">
          <p id="no-history-msg" class="text-slate-400 italic text-center py-2 text-[11px]">Nenhum cálculo registrado</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="w-full max-w-lg mx-auto p-4 text-center">
    <div id="footer-box" class="bg-slate-100 rounded-2xl p-3 border border-slate-100 text-[11px] text-slate-500 leading-relaxed font-mono-val">
      <p class="font-semibold text-slate-600 mb-1" id="footer-kbd-title">⌨️ Atalhos de Teclado:</p>
      <p id="footer-kbd-keys">Teclas [0-9] | Operadores [+, -, *, /] | Executar [Enter ou =] | Limpar [Esc] | Apagar [Backspace]</p>
    </div>
    
    <div class="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-1.5" id="credit-tag">
      <span>Calculadora Acessível LPS v1.0</span>
      <span>•</span>
      <span>Vercel Deploy Autocontido</span>
    </div>
  </footer>

  <script>
    let currentInput = "0";
    let storedInput = "";
    let mathOperator = "";
    let shouldResetInput = false;
    let activeProfile = "standard"; 
    let calculatedHistory = [];

    const vocalDic = ${JSON.stringify(VOCAL_DIC)};

    function speak(text) {
      if (activeProfile !== "vocal") return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error(e);
      }
    }

    window.addEventListener("DOMContentLoaded", () => {
      updateScreenAndAccessibility();
      window.addEventListener("keydown", handleKeyboardInput);
    });

    function formatValue(valueStr) {
      if (valueStr === "Erro" || valueStr === "NaN" || valueStr === "Infinity") return valueStr;
      const parts = valueStr.split('.');
      let integerPart = parts[0];
      let decimalPart = parts.length > 1 ? parts[1] : '';
      let output = "";
      let count = 0;
      for (let i = integerPart.length - 1; i >= 0; i--) {
        if (integerPart[i] === '-') {
          output = '-' + output;
          continue;
        }
        output = integerPart[i] + output;
        count++;
        if (count % 3 === 0 && i > 0 && integerPart[i-1] !== '-') {
          output = '.' + output;
        }
      }
      if (parts.length > 1) return output + ',' + decimalPart;
      return output;
    }

    function setProfile(profileName) {
      activeProfile = profileName;
      const body = document.getElementById("body-container");
      const card = document.getElementById("calculator-card");
      const display = document.getElementById("calculator-display");
      const expressionView = document.getElementById("expression-view");
      const inputView = document.getElementById("input-view");
      const hud = document.getElementById("accessibility-hud");
      const controlGrid = document.getElementById("calculator-buttons");
      const profileContainer = document.getElementById("profile-container");
      const footerBox = document.getElementById("footer-box");
      const drawerHistory = document.getElementById("drawer-history");
      const badgeLps = document.getElementById("badge-lps");
      const headerTitle = document.getElementById("header-title");
      const headerBorder = document.getElementById("header-border");
      const statusLabel = document.getElementById("status-label");
      const creditTag = document.getElementById("credit-tag");
      const historyLabel = document.getElementById("history-label");

      const tabStandard = document.getElementById("profile-standard");
      const tabVocal = document.getElementById("profile-vocal");
      const tabContrast = document.getElementById("profile-contrast");

      [tabStandard, tabVocal, tabContrast].forEach(tab => {
        tab.className = "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all-custom flex flex-col items-center justify-center gap-1 focus:outline-none";
        tab.setAttribute("aria-selected", "false");
      });

      body.className = "text-slate-800 min-h-screen flex flex-col justify-between transition-all-custom";
      card.className = "w-full max-w-md overflow-hidden transition-all-custom";
      display.className = "p-6 md:p-8 text-right flex flex-col justify-end min-h-[140px] transition-all-custom relative border-b";
      inputView.className = "bg-transparent text-right font-mono-val placeholder-slate-700 w-full focus:outline-none border-none p-0 select-all font-bold";
      controlGrid.className = "p-6 md:p-8 grid grid-cols-4 gap-3.5 transition-all-custom";
      profileContainer.className = "p-2.5 flex space-x-1 border-b";
      footerBox.className = "rounded-2xl p-3 border text-[11px] leading-relaxed font-mono-val text-center";
      drawerHistory.className = "p-4 border-t";
      badgeLps.className = "text-[10px] uppercase tracking-widest font-bold";
      headerTitle.className = "text-xl font-extrabold tracking-tight";
      headerBorder.className = "flex items-center justify-between border-b pb-3";
      statusLabel.className = "text-xs font-semibold";
      creditTag.className = "mt-4 text-[10px] flex items-center justify-center gap-1.5";
      historyLabel.className = "text-xs font-bold uppercase tracking-wide flex items-center gap-1";

      if (profileName === 'standard') {
        tabStandard.classList.add("bg-white", "text-slate-800", "shadow-sm");
        tabStandard.setAttribute("aria-selected", "true");
        body.classList.add("bg-slate-50", "text-slate-800");
        card.classList.add("bg-white", "shadow-xl", "border", "border-slate-100");
        display.classList.add("bg-slate-900", "text-white", "border-slate-800");
        expressionView.className = "text-slate-400 text-sm font-medium tracking-wide mb-1 font-mono-val h-6 overflow-hidden break-all";
        inputView.classList.add("text-white", "text-4xl", "md:text-5xl");
        controlGrid.classList.add("bg-slate-50/50");
        profileContainer.classList.add("bg-slate-100", "border-slate-100");
        footerBox.classList.add("bg-slate-100", "text-slate-500", "border-slate-100");
        drawerHistory.classList.add("bg-slate-100/70", "border-slate-100");
        badgeLps.classList.add("text-slate-400");
        headerTitle.classList.add("text-slate-800");
        headerBorder.classList.add("border-slate-200");
        statusLabel.classList.add("text-slate-500");
        creditTag.classList.add("text-slate-400");
        historyLabel.classList.add("text-slate-500");
        hud.innerText = "Modo Silencioso";
        hud.className = "absolute left-4 top-4 text-[10px] font-mono uppercase text-sky-400 font-bold bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/20";
        resetButtonsToDefaultStyles();
        speak("Perfil de calculadora padrão ativado.");
      } else if (profileName === 'vocal') {
        tabVocal.classList.add("bg-white", "text-sky-700", "shadow-sm");
        tabVocal.setAttribute("aria-selected", "true");
        body.classList.add("bg-sky-50/30", "text-slate-800");
        card.classList.add("bg-white", "shadow-xl", "border", "border-sky-100");
        display.classList.add("bg-sky-950", "text-white", "border-sky-900");
        expressionView.className = "text-sky-300/80 text-sm font-medium tracking-wide mb-1 font-mono-val h-6 overflow-hidden break-all";
        inputView.classList.add("text-white", "text-4xl", "md:text-5xl");
        controlGrid.classList.add("bg-sky-50/20");
        profileContainer.classList.add("bg-sky-100/40", "border-sky-100");
        footerBox.classList.add("bg-sky-100/50", "text-sky-800/70", "border-sky-150");
        drawerHistory.classList.add("bg-sky-50/10", "border-sky-100");
        badgeLps.classList.add("text-sky-600");
        headerTitle.classList.add("text-sky-900");
        headerBorder.classList.add("border-sky-100");
        statusLabel.classList.add("text-sky-700");
        creditTag.classList.add("text-sky-600/70");
        historyLabel.classList.add("text-sky-600");
        hud.innerText = "🗣️ Voz Ativa";
        hud.className = "absolute left-4 top-4 text-[10px] font-mono uppercase text-sky-300 font-bold bg-sky-900/50 px-2 py-0.5 rounded border border-sky-600/30";
        resetButtonsToDefaultStyles();
        speak("Perfil voz ativa ativado.");
      } else if (profileName === 'contrast') {
        tabContrast.classList.add("bg-yellow-400", "text-black", "shadow-sm");
        tabContrast.setAttribute("aria-selected", "true");
        body.classList.add("bg-black", "text-white");
        card.classList.add("bg-black", "border-4", "border-yellow-400");
        display.classList.add("bg-black", "text-yellow-400", "border-yellow-400", "p-8");
        expressionView.className = "text-yellow-300/90 text-xl font-bold tracking-widest mb-2 font-mono-val h-8 overflow-hidden break-all";
        inputView.classList.add("text-yellow-400", "text-5xl", "md:text-6xl");
        controlGrid.classList.add("bg-black", "gap-5", "p-8");
        profileContainer.classList.add("bg-black", "border-yellow-400", "p-3");
        footerBox.classList.add("bg-black", "text-yellow-300", "border-2", "border-yellow-400", "p-4");
        drawerHistory.classList.add("bg-black", "border-yellow-400", "p-5");
        badgeLps.classList.add("text-yellow-400", "text-sm");
        headerTitle.classList.add("text-yellow-400", "text-2xl");
        headerBorder.classList.add("border-yellow-400", "pb-4");
        statusLabel.classList.add("text-yellow-400", "text-sm");
        creditTag.classList.add("text-yellow-400", "text-xs");
        historyLabel.classList.add("text-yellow-400", "text-sm");
        hud.innerText = "👁️ Alta Visibilidade";
        hud.className = "absolute left-6 top-6 text-sm font-mono uppercase text-black font-extrabold bg-yellow-400 px-3 py-1 rounded border-2 border-black";
        applyHighContrastButtons();
        speak("Perfil alto contraste ativado.");
      }
    }

    function resetButtonsToDefaultStyles() {
      const nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "comma"];
      nums.forEach(n => {
        const btn = document.getElementById("btn-" + n);
        btn.className = "py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-semibold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
        if (n === "0") btn.classList.add("col-span-2");
      });
      const ops = ["div", "mul", "sub", "add"];
      ops.forEach(op => {
        const btn = document.getElementById("btn-" + op);
        btn.className = "py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
      });
      document.getElementById("btn-clear").className = "col-span-2 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center gap-1 focus:outline-none";
      document.getElementById("btn-back").className = "py-4 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-lg cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
      document.getElementById("btn-equal").className = "py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
    }

    function applyHighContrastButtons() {
      const nums = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "comma"];
      nums.forEach(n => {
        const btn = document.getElementById("btn-" + n);
        btn.className = "py-5 rounded-none bg-black hover:bg-zinc-900 text-yellow-400 border-4 border-yellow-400 font-black text-3xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
        if (n === "0") btn.classList.add("col-span-2");
      });
      const ops = ["div", "mul", "sub", "add"];
      ops.forEach(op => {
        const btn = document.getElementById("btn-" + op);
        btn.className = "py-5 rounded-none bg-yellow-400 hover:bg-yellow-300 text-black font-black text-3xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
      });
      document.getElementById("btn-clear").className = "col-span-2 py-5 rounded-none bg-black hover:bg-zinc-800 text-red-500 border-4 border-red-500 font-black text-2xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
      document.getElementById("btn-back").className = "py-5 rounded-none bg-black hover:bg-zinc-800 text-white border-4 border-white font-black text-2xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
      document.getElementById("btn-equal").className = "py-5 rounded-none bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-yellow-400 font-black text-4xl cursor-pointer transition-all-custom active:scale-95 flex items-center justify-center focus:outline-none";
    }

    function pressKey(key) {
      if (activeProfile === "vocal" && vocalDic[key]) {
        speak(vocalDic[key]);
      }
      if (key >= '0' && key <= '9') {
        appendDigit(key);
      } else if (key === ',' || key === '.') {
        appendComma();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        setOperator(key);
      } else if (key === '=') {
        calculateResult();
      } else if (key === 'C') {
        clearCalculator();
      } else if (key === 'Backspace') {
        handleBackspace();
      }
      animateButtonFeedback(key);
      updateScreenAndAccessibility();
    }

    function appendDigit(digit) {
      if (currentInput === "0" || shouldResetInput) {
        currentInput = digit;
        shouldResetInput = false;
      } else {
        if (currentInput.replace(/[.,]/g, '').length < 15) {
          currentInput += digit;
        }
      }
    }

    function appendComma() {
      if (shouldResetInput) {
        currentInput = "0.";
        shouldResetInput = false;
        return;
      }
      if (!currentInput.includes('.')) {
        currentInput += '.';
      }
    }

    function setOperator(op) {
      if (mathOperator && !shouldResetInput) {
        calculateResult();
      }
      storedInput = currentInput;
      mathOperator = op;
      shouldResetInput = true;
    }

    function handleBackspace() {
      if (shouldResetInput) {
        currentInput = "0";
        return;
      }
      if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
        if (currentInput === "-" || currentInput === "") {
          currentInput = "0";
        }
      } else {
        currentInput = "0";
      }
    }

    function clearCalculator() {
      currentInput = "0";
      storedInput = "";
      mathOperator = "";
      shouldResetInput = false;
    }

    function calculateResult() {
      if (!mathOperator || storedInput === "") return;
      const num1 = parseFloat(storedInput);
      const num2 = parseFloat(currentInput);
      let outcome = 0;
      if (isNaN(num1) || isNaN(num2)) return;
      switch (mathOperator) {
        case '+': outcome = num1 + num2; break;
        case '-': outcome = num1 - num2; break;
        case '*': outcome = num1 * num2; break;
        case '/':
          if (num2 === 0) {
            outcome = "Erro";
          } else {
            outcome = num1 / num2;
          }
          break;
        default: return;
      }
      let finalVal = String(outcome);
      if (typeof outcome === 'number' && !Number.isInteger(outcome)) {
        finalVal = parseFloat(outcome.toFixed(8)).toString();
      }
      const readableOp = mathOperator === '*' ? '×' : (mathOperator === '/' ? '÷' : mathOperator);
      const logString = formatValue(storedInput) + " " + readableOp + " " + formatValue(currentInput) + " = " + formatValue(finalVal);
      addHistoryLog(logString);
      if (activeProfile === "vocal") {
        if (outcome === "Erro") {
          speak("Erro, divisão por zero!");
        } else {
          speak("Igual a " + String(finalVal).replace('.', ' vírgula '));
        }
      }
      currentInput = finalVal;
      mathOperator = "";
      storedInput = "";
      shouldResetInput = true;
    }

    function addHistoryLog(expr) {
      calculatedHistory.unshift(expr);
      if (calculatedHistory.length > 10) {
        calculatedHistory.pop();
      }
      renderHistoryList();
    }

    function renderHistoryList() {
      const parent = document.getElementById("history-list");
      parent.innerHTML = "";
      if (calculatedHistory.length === 0) {
        parent.innerHTML = '<p id="no-history-msg" class="text-slate-400 italic text-center py-2 text-[11px]">Nenhum cálculo registrado</p>';
        return;
      }
      calculatedHistory.forEach(item => {
        const p = document.createElement("p");
        p.className = "py-1 border-b border-dashed border-slate-200 text-slate-700 last:border-b-0 cursor-pointer hover:underline flex justify-between items-center";
        p.innerHTML = "<span>" + item + "</span>" +
          "<button onclick=\\"speak('" + item.replace('=', 'igual a').replaceAll('*', 'vezes').replaceAll('/', 'dividido por').replaceAll('×', 'vezes').replaceAll('÷', 'dividido por').replaceAll(',', ' vírgula ') + "')\\" class='p-1 text-[10px] text-sky-500 hover:text-sky-700' style='cursor: pointer;'>🗣️ Ler</button>";
        parent.appendChild(p);
      });
    }

    function clearHistory() {
      calculatedHistory = [];
      renderHistoryList();
    }

    function updateScreenAndAccessibility() {
      const inputView = document.getElementById("input-view");
      const expressionView = document.getElementById("expression-view");
      inputView.value = formatValue(currentInput);
      if (mathOperator && storedInput !== "") {
        const opGlyph = mathOperator === '*' ? '×' : (mathOperator === '/' ? '÷' : mathOperator);
        expressionView.innerText = formatValue(storedInput) + " " + opGlyph;
      } else {
        expressionView.innerText = "";
      }
    }

    function animateButtonFeedback(key) {
      let elementId = "";
      if (key >= '0' && key <= '9') elementId = "btn-" + key;
      else if (key === '+') elementId = "btn-add";
      else if (key === '-') elementId = "btn-sub";
      else if (key === '*') elementId = "btn-mul";
      else if (key === '/') elementId = "btn-div";
      else if (key === '=') elementId = "btn-equal";
      else if (key === ',') elementId = "btn-comma";
      else if (key === 'C') elementId = "btn-clear";
      else if (key === 'Backspace') elementId = "btn-back";
      if (!elementId) return;
      const target = document.getElementById(elementId);
      if (target) {
        target.classList.add("scale-95");
        setTimeout(() => {
          target.classList.remove("scale-95");
        }, 120);
      }
    }

    function handleKeyboardInput(event) {
      const permittedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '=', 'Enter', 'Escape', 'Backspace', '.', ',', 'c', 'C'];
      if (permittedKeys.includes(event.key)) {
        if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
        pressKey(event.key === 'Enter' ? '=' : (event.key === 'Escape' ? 'C' : event.key));
      }
    }
  </script>
</body>
</html>`;
  };

  // Safe checks if key matches visually pressed style for feedback animations
  const isKeyActive = (keySymbol: string) => {
    if (lastKeyPressed === null) return false;
    if (keySymbol === lastKeyPressed) return true;
    if (keySymbol === '=' && lastKeyPressed === 'Enter') return true;
    if (keySymbol === 'C' && (lastKeyPressed === 'Escape' || lastKeyPressed === 'c' || lastKeyPressed === 'C')) return true;
    if (keySymbol === ',' && lastKeyPressed === '.') return true;
    return false;
  };

  return (
    <div className={`min-h-screen ${activeProfile === 'contrast' ? 'bg-zinc-950 text-white' : 'bg-slate-100 text-slate-800'} transition-all duration-200 font-sans flex flex-col items-center justify-center p-4`}>
      
      {/* 1. Left Section: Real Live Interactive Calculator Applet */}
      <div className="w-full max-w-md flex flex-col items-center justify-center">
        
        {/* Profile Branding Header */}
        <div className="w-full max-w-md mb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase ${activeProfile === 'contrast' ? 'bg-yellow-400 text-black' : 'bg-amber-100 text-amber-800'}`}>LPS v1.0</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculadora Acessível</span>
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${activeProfile === 'contrast' ? 'text-yellow-400' : 'text-slate-800'}`}>
              Variabilidade de Perfis
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${activeProfile === 'contrast' ? 'text-yellow-400' : 'text-slate-400'}`}>
              Ativo
            </span>
          </div>
        </div>

        {/* The Frame of the Calculator */}
        <div 
          className={`w-full max-w-md overflow-hidden transition-all duration-300 ${
            activeProfile === 'contrast' 
              ? 'bg-black border-4 border-yellow-400 rounded-none' 
              : 'bg-white rounded-3xl shadow-xl border border-slate-100'
          }`}
          role="application"
          aria-label="Calculadora Acessível de Matemática Básica"
        >
          {/* Variability Profile Segmented Selector Panel */}
          <div className={`p-2.5 flex gap-1 ${activeProfile === 'contrast' ? 'bg-zinc-900 border-b-4 border-yellow-400' : 'bg-slate-100 border-b border-slate-100'}`}>
            
            {/* Standard Profile Tab Button */}
            <button
              onClick={() => selectProfile('standard')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 focus:outline-none ${
                activeProfile === 'standard'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
              title="Perfil Silencioso Padrão"
            >
              <Smartphone className="w-4 h-4" />
              <span>Padrão</span>
            </button>

            {/* Vocal active Profile Tab Button */}
            <button
              onClick={() => selectProfile('vocal')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 focus:outline-none ${
                activeProfile === 'vocal'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : activeProfile === 'contrast' ? 'text-yellow-400 hover:text-yellow-100 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
              title="Perfil Voz Ativa: Fala comandos e teclas em português"
            >
              <Volume2 className="w-4 h-4" />
              <span>Voz Ativa</span>
            </button>

            {/* High Contrast Profile Tab Button */}
            <button
              onClick={() => selectProfile('contrast')}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 text-black font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
              }`}
              title="Perfil Alto Contraste: Prepara cores e fontes para visual estreito"
            >
              <Eye className="w-4 h-4" />
              <span>Contraste</span>
            </button>
          </div>

          {/* Liquid Crystal Display HUD */}
          <div className={`relative px-6 py-8 text-right flex flex-col justify-end min-h-[150px] transition-all duration-300 border-b ${
            activeProfile === 'contrast' 
              ? 'bg-black text-yellow-400 border-yellow-400' 
              : 'bg-slate-900 text-white border-slate-800'
          }`}>
            
            {/* Status Indicator Tag */}
            <div className={`absolute left-4 top-4 text-[9px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded cursor-default border ${
              activeProfile === 'contrast'
                ? 'bg-yellow-400 text-black border-black'
                : activeProfile === 'vocal'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                : 'bg-sky-950/80 text-sky-300 border-sky-800/40'
            }`}>
              {activeProfile === 'standard' && "🔇 Silenciosa"}
              {activeProfile === 'vocal' && "🔊 Voz Ativa"}
              {activeProfile === 'contrast' && "👁️ Alto Contraste"}
            </div>

            {/* Expression sequence preview */}
            <div className={`font-mono h-6 text-sm mb-1 break-all overflow-hidden tracking-wide text-right ${
              activeProfile === 'contrast' ? 'text-yellow-300 font-black text-lg' : 'text-slate-400'
            }`}>
              {mathOperator && storedInput !== "" ? (
                <>
                  {formatValue(storedInput)} {mathOperator === '*' ? '×' : (mathOperator === '/' ? '÷' : mathOperator)}
                </>
              ) : (
                <span className="opacity-0">0</span>
              )}
            </div>

            {/* Big reading text value */}
            <div className="w-full overflow-hidden text-right">
              <input
                type="text"
                readOnly
                aria-live="polite"
                aria-label={`Valor atual ${formatValue(currentInput)}`}
                className={`bg-transparent text-right font-semibold font-mono w-full p-0 border-none outline-none focus:ring-0 ${
                  activeProfile === 'contrast' 
                    ? 'text-yellow-400 text-6xl font-black' 
                    : 'text-white text-4xl sm:text-5xl'
                }`}
                value={formatValue(currentInput)}
              />
            </div>
          </div>

          {/* Button Grid Matrix */}
          <div className={`p-6 sm:p-8 grid grid-cols-4 gap-3 md:gap-4 transition-all duration-300 ${
            activeProfile === 'contrast' ? 'bg-black p-8 gap-5' : 'bg-slate-50/50'
          }`}>
            
            {/* Clear Button */}
            <button
              onClick={() => handleAction('C')}
              className={`col-span-2 py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-black text-red-500 border-4 border-red-500 rounded-none text-2xl font-black py-5'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 active:scale-95'
              } ${isKeyActive('C') ? 'scale-90 opacity-80' : ''}`}
            >
              Limpar
            </button>

            {/* Backspace Button */}
            <button
              onClick={() => handleAction('Backspace')}
              className={`py-4 rounded-2xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-black text-white border-4 border-white rounded-none text-2xl font-black py-5'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 active:scale-95'
              } ${isKeyActive('Backspace') ? 'scale-90 opacity-80' : ''}`}
              title="Apagar último dígito"
              aria-label="Apagar último"
            >
              <span className="font-mono text-xl">⌫</span>
            </button>

            {/* Divide Operator Button */}
            <button
              onClick={() => handleAction('/')}
              className={`py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-3xl font-black py-5'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
              } ${isKeyActive('/') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Dividido por"
            >
              ÷
            </button>

            {/* Row 2 */}
            {['7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleAction(num)}
                className={`py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                  activeProfile === 'contrast'
                    ? 'bg-black text-yellow-400 border-4 border-yellow-400 rounded-none text-3xl font-black py-5'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
                } ${isKeyActive(num) ? 'scale-90 opacity-80' : ''}`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleAction('*')}
              className={`py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-3xl font-black py-5'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
              } ${isKeyActive('*') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Multiplicado por"
            >
              ×
            </button>

            {/* Row 3 */}
            {['4', '5', '6'].map(num => (
              <button
                key={num}
                onClick={() => handleAction(num)}
                className={`py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                  activeProfile === 'contrast'
                    ? 'bg-black text-yellow-400 border-4 border-yellow-400 rounded-none text-3xl font-black py-5'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
                } ${isKeyActive(num) ? 'scale-90 opacity-80' : ''}`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleAction('-')}
              className={`py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-3xl font-black py-5'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
              } ${isKeyActive('-') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Menos"
            >
              −
            </button>

            {/* Row 4 */}
            {['1', '2', '3'].map(num => (
              <button
                key={num}
                onClick={() => handleAction(num)}
                className={`py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                  activeProfile === 'contrast'
                    ? 'bg-black text-yellow-400 border-4 border-yellow-400 rounded-none text-3xl font-black py-5'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
                } ${isKeyActive(num) ? 'scale-90 opacity-80' : ''}`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleAction('+')}
              className={`py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black rounded-none text-3xl font-black py-5'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
              } ${isKeyActive('+') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Mais"
            >
              +
            </button>

            {/* Row 5 */}
            <button
              onClick={() => handleAction('0')}
              className={`col-span-2 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-black text-yellow-400 border-4 border-yellow-400 rounded-none text-3xl font-black py-5'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
              } ${isKeyActive('0') ? 'scale-90 opacity-80' : ''}`}
            >
              0
            </button>
            <button
              onClick={() => handleAction(',')}
              className={`py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-black text-yellow-400 border-4 border-yellow-400 rounded-none text-3xl font-black py-5'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
              } ${isKeyActive(',') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Vírgula decimal"
            >
              ,
            </button>
            <button
              onClick={() => handleAction('=')}
              className={`py-4 rounded-2xl text-xl font-bold transition-all flex items-center justify-center cursor-pointer focus:outline-none ${
                activeProfile === 'contrast'
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-4 border-yellow-400 rounded-none text-4xl font-black py-5'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
              } ${isKeyActive('=') ? 'scale-90 opacity-80' : ''}`}
              aria-label="Igual"
            >
              =
            </button>
          </div>

          {/* Accessible recent calculations log */}
          <div className={`p-5 border-t transition-all duration-300 ${
            activeProfile === 'contrast' ? 'bg-black border-yellow-400' : 'bg-slate-100/70 border-slate-100'
          }`}>
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider">
              <span className={`flex items-center gap-1.5 ${activeProfile === 'contrast' ? 'text-yellow-400' : 'text-slate-500'}`}>
                <History className="w-3.5 h-3.5" />
                Histórico de Operações
              </span>
              {calculatedHistory.length > 0 && (
                <button
                  onClick={() => {
                    setCalculatedHistory([]);
                    speak("Histórico limpo.");
                  }}
                  className={`flex items-center gap-1 text-[10px] uppercase font-semibold cursor-pointer hover:underline focus:outline-none ${
                    activeProfile === 'contrast' ? 'text-yellow-300' : 'text-slate-400 hover:text-rose-600'
                  }`}
                  title="Wipe previous records"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar
                </button>
              )}
            </div>

            <div className="max-h-24 overflow-y-auto space-y-1.5 scrollbar-thin select-all">
              {calculatedHistory.length === 0 ? (
                <p className={`text-center py-3 text-xs italic ${activeProfile === 'contrast' ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Nenhuma conta realizada ainda
                </p>
              ) : (
                calculatedHistory.map((expr, index) => (
                  <div 
                    key={index} 
                    className={`text-xs font-mono py-1 border-b border-dashed flex justify-between items-center transition-all ${
                      activeProfile === 'contrast' 
                        ? 'border-yellow-400/30 text-yellow-300 font-bold' 
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{expr}</span>
                    <button 
                      onClick={() => {
                        const vocalized = expr
                          .replace('=', 'igual a')
                          .replaceAll('*', 'vezes')
                          .replaceAll('/', 'dividido por')
                          .replaceAll('×', 'vezes')
                          .replaceAll('÷', 'dividido por')
                          .replaceAll(',', ' vírgula ');
                        // Momentarily set vocal profile to trigger speech read
                        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                          const utterance = new SpeechSynthesisUtterance(vocalized);
                          utterance.lang = 'pt-BR';
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1 focus:outline-none ${
                        activeProfile === 'contrast'
                          ? 'bg-black text-yellow-400 border border-yellow-400 hover:bg-yellow-400 hover:text-black font-semibold'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900'
                      }`}
                      title="Ouvir este cálculo em português"
                    >
                      🗣️ Ler
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Keyboard Instructions Info Bar */}
        <div className={`mt-5 w-full max-w-md rounded-2xl p-4 border text-[11px] leading-relaxed transition-all duration-300 ${
          activeProfile === 'contrast'
            ? 'bg-black text-yellow-300 border-yellow-400 font-bold'
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1.5">
            <Keyboard className="w-3.5 h-3.5 text-amber-500" />
            <span>Teclado Físico Habilitado:</span>
          </div>
          <p>
            • Operadores: <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">/</code> 
            <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">*</code> 
            <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">-</code> 
            <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">+</code>
          </p>
          <p className="mt-1">
            • Ações: <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">Enter</code> ou <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">=</code> para resultado | <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">Esc</code> para Limpar | <code className="px-1 rounded bg-slate-200 text-slate-700 font-mono font-bold mx-0.5">Backspace</code> para Apagar
          </p>
        </div>
      </div>
    </div>
  );
}
