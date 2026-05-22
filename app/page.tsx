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
