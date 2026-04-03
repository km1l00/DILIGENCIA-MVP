"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, Radio, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

Tengo acceso al perfil de riesgo actual de su empresa, incluyendo su calificación por área, los hallazgos identificados y los documentos cargados.

Puedo ayudarle con:
- Análisis detallado de cada hallazgo
- Priorización de acciones correctivas
- Impacto en el score al resolver cada punto
- Documentos pendientes de carga

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
      // Solo enviamos los mensajes sin el inicial
      const history = updatedMessages
        .filter(m => m.id !== "initial")
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error("Error al consultar el asistente")
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      toast.error("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass/20 border border-brass/30">
          <Radio className="h-5 w-5 text-brass" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asistente IA</h1>
          <p className="text-sm text-muted-foreground">
            Consultas sobre su due diligence en tiempo real
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-starboard-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-starboard-green" />
          </span>
          <span className="text-xs text-starboard-green font-medium">En línea</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brass/20 border border-brass/30 mt-1">
                  <Bot className="h-4 w-4 text-brass" />
                </div>
              )}

              <div className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-brass/20 border border-brass/30 text-foreground rounded-tr-sm"
                  : "bg-card border border-border/50 text-foreground rounded-tl-sm"
              )}>
                {message.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none
                    prose-p:my-1 prose-p:leading-relaxed
                    prose-strong:text-brass prose-strong:font-semibold
                    prose-ul:my-1 prose-ul:pl-4
                    prose-li:my-0.5
                    prose-headings:text-foreground prose-headings:font-semibold
                    prose-code:text-brass prose-code:bg-brass/10 prose-code:px-1 prose-code:rounded
                  ">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                <p suppressHydrationWarning className="mt-2 text-[10px] text-muted-foreground/60">
                  {message.timestamp.toLocaleTimeString('es-CO', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              {message.role === "user" && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-navy-medium border border-border/50 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brass/20 border border-brass/30 mt-1">
              <Bot className="h-4 w-4 text-brass" />
            </div>
            <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brass/60 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-brass/60 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-brass/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-3 flex-shrink-0">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => sendMessage(action)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border border-brass/30 text-brass/80 hover:bg-brass/10 hover:text-brass hover:border-brass transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escriba su consulta sobre el due diligence..."
          disabled={isLoading}
          className="flex-1 bg-card border-border/50 focus:border-brass h-11"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-brass hover:bg-brass-light text-navy-deep font-semibold h-11 px-4"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
