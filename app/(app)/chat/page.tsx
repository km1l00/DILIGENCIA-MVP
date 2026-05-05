"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Radio, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const quickActions = [
  "¿Cuál es mi mayor riesgo?",
  "¿Qué debo resolver primero?",
  "Resume mi score actual",
  "¿Qué documentos me faltan?",
  "¿Cuánto subiría mi score si resuelvo todo?",
]

const welcomeMessage: Message = {
  id: "initial",
  role: "assistant",
  content: `**Bienvenido al Asistente de Due Diligence**

Tengo acceso al perfil de riesgo actual de su empresa — calificación por área, hallazgos identificados y documentos cargados.

¿En qué puedo ayudarle hoy?`,
  timestamp: new Date(),
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsLoading(true)

    try {
      const history = updatedMessages
        .filter(m => m.id !== "initial")
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()
      if (!res.ok) { toast.error("Error al consultar el asistente"); return }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }])
    } catch {
      toast.error("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="glass mb-4 flex-shrink-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(234,188,31,0.12)] border border-[rgba(234,188,31,0.2)]">
            <Radio className="h-5 w-5 text-[#EABC1F]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1D3A45]">Asistente IA</h1>
            <p className="text-xs text-[#7A7A7A]">Consultas sobre su due diligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2ecc71] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2ecc71]" />
          </span>
          <span className="text-xs text-[#2ecc71] font-medium">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(234,188,31,0.12)] border border-[rgba(234,188,31,0.2)] mt-1">
                  <Bot className="h-4 w-4 text-[#EABC1F]" />
                </div>
              )}
              <div className={cn(
                "max-w-[75%] px-4 py-3 text-sm",
                message.role === "assistant" ? "glass-bubble-ai" : "glass-bubble-user"
              )}>
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-[#1D3A45]
                    prose-p:my-1 prose-p:leading-relaxed
                    prose-strong:text-[#254B59] prose-strong:font-semibold
                    prose-ul:my-1 prose-ul:pl-4 prose-li:my-0.5
                    prose-headings:text-[#1D3A45] prose-headings:font-semibold
                  ">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[#1D3A45]">{message.content}</p>
                )}
                <p className="mt-2 text-[10px] text-[#7A7A7A]/60">
                  {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl glass-sm mt-1">
                  <User className="h-4 w-4 text-[#254B59]" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(234,188,31,0.12)] border border-[rgba(234,188,31,0.2)] mt-1">
              <Bot className="h-4 w-4 text-[#EABC1F]" />
            </div>
            <div className="glass-bubble-ai px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="h-2 w-2 rounded-full bg-[#EABC1F]/60 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-3 flex-shrink-0">
        {quickActions.map(action => (
          <button key={action} onClick={() => sendMessage(action)} disabled={isLoading}
            className="glass-pill disabled:opacity-40 disabled:cursor-not-allowed">
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="glass-input flex gap-3 p-2 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
          placeholder="Escriba su consulta sobre el due diligence..."
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none text-sm text-[#1D3A45] placeholder:text-[#7A7A7A]/50 px-2"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="glass-btn-primary flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
