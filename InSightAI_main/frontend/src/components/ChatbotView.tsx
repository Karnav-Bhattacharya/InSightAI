
import React, { useState, useRef, useEffect } from 'react';

import { motion, AnimatePresence } from 'motion/react';

import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  Lightbulb,
  RotateCcw
} from 'lucide-react';

import { HRUser, Insight, ChatMessage } from '../types';

import {
  askInsightChatbot,
  getInitialChatMessages
} from '../services/ragService';


interface ChatbotViewProps {
  user: HRUser;
  insights: Insight[];
  onBackToDashboard: () => void;
}


export const ChatbotView: React.FC<ChatbotViewProps> = ({
  user,
  insights,
  onBackToDashboard
}) => {

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getInitialChatMessages(user.role, insights)
  );

  const [currentInsightId, setCurrentInsightId] =
    useState<number | null>(null);

  const [inputQuery, setInputQuery] = useState('');

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);


  // Auto-scroll to bottom of messages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);


  useEffect(() => {
    inputRef.current?.focus();
  }, []);


  const handleSend = async (
    queryToSend?: string
  ) => {

    const text =
      (queryToSend || inputQuery).trim();

    if (!text || isTyping) return;


    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    };


    setMessages((prev) => [
      ...prev,
      userMessage
    ]);

    setInputQuery('');

    setIsTyping(true);


    try {

      const response =
        await askInsightChatbot(
          text,
          user.role,
          insights,
          currentInsightId
        );


      if (
        response.updatedContextInsightId !== undefined
      ) {

        setCurrentInsightId(
          response.updatedContextInsightId
        );

      }


      const aiMessage: ChatMessage = {

        id: `ai_${Date.now()}`,

        sender: 'ai',

        text: response.answer,

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          ),

        relatedInsightTitle:
          response.matchedInsight?.title,

        suggestedQuestions:
          response.suggestedQuestions

      };


      setMessages((prev) => [
        ...prev,
        aiMessage
      ]);


    } catch (err) {

      console.error(
        'Chat error:',
        err
      );


      setMessages((prev) => [

        ...prev,

        {

          id:
            `ai_err_${Date.now()}`,

          sender: 'ai',

          text:
            "I encountered an issue analyzing your insights. Please try asking again.",

          timestamp:
            new Date().toLocaleTimeString(
              [],
              {
                hour: '2-digit',
                minute: '2-digit'
              }
            )

        }

      ]);

    } finally {

      setIsTyping(false);

    }

  };


  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {

    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {

      e.preventDefault();

      handleSend();

    }

  };


  const handleResetChat = () => {

    setCurrentInsightId(null);

    setMessages(
      getInitialChatMessages(
        user.role,
        insights
      )
    );

  };


  const renderFormattedText = (
    text: string
  ) => {

    const lines =
      text.split('\n');


    return (

      <div className="space-y-2 text-[14.5px] leading-relaxed">

        {lines.map((line, idx) => {

          if (!line.trim()) {

            return (
              <div
                key={idx}
                className="h-1.5"
              />
            );

          }


          if (
            line.startsWith('### ')
          ) {

            return (

              <h3
                key={idx}
                className="text-base font-bold text-[#243447] tracking-tight pt-1"
              >

                {line.replace(
                  '### ',
                  ''
                )}

              </h3>

            );

          }


          if (
            line.startsWith('• ')
          ) {

            return (

              <div
                key={idx}
                className="flex items-start gap-2 text-[#3f4d57] pl-1"
              >

                <span className="text-[#7FAAB1] font-bold mt-0.5">

                  •

                </span>

                <span>

                  {formatInlineMarkdown(
                    line.substring(2)
                  )}

                </span>

              </div>

            );

          }


          return (

            <p
              key={idx}
              className="text-[#3f4d57]"
            >

              {formatInlineMarkdown(line)}

            </p>

          );

        })}

      </div>

    );

  };


  const formatInlineMarkdown = (
    str: string
  ) => {

    const parts =
      str.split(
        /(\*\*.*?\*\*)/g
      );


    return parts.map(
      (part, i) => {

        if (
          part.startsWith('**') &&
          part.endsWith('**')
        ) {

          return (

            <strong
              key={i}
              className="font-semibold text-[#243447]"
            >

              {part.slice(
                2,
                -2
              )}

            </strong>

          );

        }


        return part;

      }
    );

  };


  return (

    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col px-4 sm:px-6 py-3 relative text-[#243447]">


      {/* Top Header Navigation */}

      <div className="flex items-center justify-between pb-3.5 border-b border-[#d9e2e5] mb-3">


        <div className="flex items-center gap-3">


          <button
            id="back-to-dashboard-btn"
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#eef5f6] border border-[#d9e2e5] hover:border-[#9FBFC4] text-[#53616b] hover:text-[#243447] transition-all text-xs font-medium cursor-pointer group shadow-sm"
          >

            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#7FAAB1]" />

            <span>
              Back to Dashboard
            </span>

          </button>


          <div className="h-4 w-px bg-[#d9e2e5]" />


          <h1 className="text-base sm:text-lg font-bold text-[#243447] tracking-tight flex items-center gap-2">

            <Sparkles className="w-4 h-4 text-[#7FAAB1]" />

            Ask Anything

          </h1>

        </div>


        <button
          onClick={handleResetChat}
          title="Reset conversation"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6b7780] hover:text-[#243447] hover:bg-[#eef5f6] rounded-lg border border-transparent hover:border-[#d9e2e5] transition-all cursor-pointer"
        >

          <RotateCcw className="w-3.5 h-3.5" />

          <span className="hidden sm:inline">

            Reset

          </span>

        </button>


      </div>



      {/* Chat Messages */}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-[#c7d6d9] scrollbar-track-transparent min-h-[460px] max-h-[calc(100vh-230px)]">


        <AnimatePresence initial={false}>


          {messages.map((message) => {


            const isAI =
              message.sender === 'ai';


            return (

              <motion.div

                key={message.id}

                initial={{
                  opacity: 0,
                  y: 10
                }}

                animate={{
                  opacity: 1,
                  y: 0
                }}

                transition={{
                  duration: 0.25
                }}

                className={`flex gap-3 ${
                  isAI
                    ? 'justify-start'
                    : 'justify-end'
                }`}
              >


                {/* AI Avatar */}

                {isAI && (

                  <div className="w-8 h-8 rounded-xl bg-[#9FBFC4] flex items-center justify-center text-white shrink-0 shadow-md border border-[#89AEB4] mt-0.5">

                    <Bot className="w-4 h-4" />

                  </div>

                )}



                {/* Message Bubble */}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${
                    isAI
                      ? 'items-start'
                      : 'items-end'
                  }`}
                >


                  <div
                    className={`rounded-2xl px-4 sm:px-5 py-3.5 shadow-sm ${
                      isAI
                        ? 'bg-white border border-[#d9e2e5] text-[#3f4d57]'
                        : 'bg-[#EFC29F] text-[#243447] font-normal border border-[#e3b58f]'
                    }`}
                  >


                    {/* Related Insight */}

                    {isAI &&
                      message.relatedInsightTitle && (

                        <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-[#e4eaec] text-[11px] font-semibold text-[#5f858b]">

                          <Lightbulb className="w-3.5 h-3.5 text-[#7FAAB1]" />

                          <span>

                            Referenced Insight:
                            {' '}
                            {message.relatedInsightTitle}

                          </span>

                        </div>

                      )}


                    {isAI

                      ? renderFormattedText(
                          message.text
                        )

                      : (

                        <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">

                          {message.text}

                        </p>

                      )

                    }


                  </div>



                  {/* Timestamp */}

                  <span className="text-[10px] text-[#8a969d] mt-1 px-1">

                    {message.timestamp}

                  </span>



                  {/* Suggested Questions */}

                  {isAI &&
                    message.suggestedQuestions &&
                    message.suggestedQuestions.length > 0 && (

                      <div className="flex flex-wrap gap-1.5 mt-2">


                        {message.suggestedQuestions.map(
                          (sug, sIdx) => (

                            <button

                              key={sIdx}

                              onClick={() =>
                                handleSend(sug)
                              }

                              className="text-xs px-3 py-1.5 rounded-full bg-white hover:bg-[#eef5f6] border border-[#d9e2e5] hover:border-[#9FBFC4] text-[#5f7078] hover:text-[#243447] transition-all cursor-pointer text-left flex items-center gap-1.5 shadow-sm"
                            >

                              <HelpCircle className="w-3 h-3 text-[#7FAAB1] shrink-0" />

                              <span>

                                {sug}

                              </span>

                            </button>

                          )
                        )}


                      </div>

                    )}


                </div>



                {/* User Avatar */}

                {!isAI && (

                  <div className="w-8 h-8 rounded-xl bg-[#53616b] flex items-center justify-center text-white shrink-0 border border-[#6c7a83] mt-0.5">

                    <User className="w-4 h-4 text-white" />

                  </div>

                )}


              </motion.div>

            );

          })}


        </AnimatePresence>



        {/* Typing Indicator */}

        {isTyping && (

          <motion.div

            initial={{
              opacity: 0,
              y: 6
            }}

            animate={{
              opacity: 1,
              y: 0
            }}

            className="flex items-center gap-3"
          >


            <div className="w-8 h-8 rounded-xl bg-[#9FBFC4] flex items-center justify-center text-white shrink-0 shadow-md border border-[#89AEB4]">

              <Bot className="w-4 h-4" />

            </div>


            <div className="bg-white border border-[#d9e2e5] rounded-2xl px-4 py-3 flex items-center gap-2">


              <div
                className="w-2 h-2 rounded-full bg-[#7FAAB1] animate-bounce"
                style={{
                  animationDelay: '0ms'
                }}
              />


              <div
                className="w-2 h-2 rounded-full bg-[#7FAAB1] animate-bounce"
                style={{
                  animationDelay: '150ms'
                }}
              />


              <div
                className="w-2 h-2 rounded-full bg-[#7FAAB1] animate-bounce"
                style={{
                  animationDelay: '300ms'
                }}
              />


              <span className="text-xs text-[#7b878d] ml-1">

                Analyzing insights...

              </span>


            </div>


          </motion.div>

        )}


        <div ref={messagesEndRef} />


      </div>



      {/* Bottom Input */}

      <div className="mt-3 relative z-10">


        <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-white backdrop-blur-md border border-[#cbd9dc] shadow-lg focus-within:border-[#9FBFC4] focus-within:ring-2 focus-within:ring-[#9FBFC4]/20 transition-all">


          <input

            ref={inputRef}

            id="chat-input-field"

            type="text"

            value={inputQuery}

            onChange={(e) =>
              setInputQuery(e.target.value)
            }

            onKeyDown={handleKeyDown}

            disabled={isTyping}

            placeholder="Type your question here... (e.g. Why did this happen?)"

            className="flex-1 bg-transparent px-3 sm:px-4 py-2 text-sm text-[#243447] placeholder-[#8a969d] focus:outline-none"

          />


          <button

            id="chat-send-btn"

            onClick={() =>
              handleSend()
            }

            disabled={
              !inputQuery.trim() ||
              isTyping
            }

            aria-label="Send message"

            className="px-4 py-2 sm:py-2.5 rounded-xl bg-[#EFC29F] hover:bg-[#e8b98f] text-[#243447] font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
          >

            <span>

              Send

            </span>

            <Send className="w-3.5 h-3.5" />

          </button>


        </div>


      </div>


    </div>

  );

};

// import React, { useState, useRef, useEffect } from 'react';
// import { motion, AnimatePresence } from 'motion/react';
// import { 
//   ArrowLeft, 
//   Send, 
//   Sparkles, 
//   Bot, 
//   User, 
//   HelpCircle,
//   Lightbulb,
//   RotateCcw
// } from 'lucide-react';
// import { HRUser, Insight, ChatMessage } from '../types';
// import { askInsightChatbot, getInitialChatMessages } from '../services/ragService';

// interface ChatbotViewProps {
//   user: HRUser;
//   insights: Insight[];
//   onBackToDashboard: () => void;
// }

// export const ChatbotView: React.FC<ChatbotViewProps> = ({
//   user,
//   insights,
//   onBackToDashboard
// }) => {
//   const [messages, setMessages] = useState<ChatMessage[]>(() => 
//     getInitialChatMessages(user.role, insights)
//   );
//   const [currentInsightId, setCurrentInsightId] = useState<number | null>(null);
//   const [inputQuery, setInputQuery] = useState('');
//   const [isTyping, setIsTyping] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Auto-scroll to bottom of messages
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isTyping]);

//   useEffect(() => {
//     inputRef.current?.focus();
//   }, []);

//   const handleSend = async (queryToSend?: string) => {
//     const text = (queryToSend || inputQuery).trim();
//     if (!text || isTyping) return;

//     const userMessage: ChatMessage = {
//       id: `user_${Date.now()}`,
//       sender: 'user',
//       text: text,
//       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     setInputQuery('');
//     setIsTyping(true);

//     try {
//       // Call the simulated RAG Service with active conversation context
//       const response = await askInsightChatbot(text, user.role, insights, currentInsightId);

//       // Update current insight context if identified or retained
//       if (response.updatedContextInsightId !== undefined) {
//         setCurrentInsightId(response.updatedContextInsightId);
//       }

//       const aiMessage: ChatMessage = {
//         id: `ai_${Date.now()}`,
//         sender: 'ai',
//         text: response.answer,
//         timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         relatedInsightTitle: response.matchedInsight?.title,
//         suggestedQuestions: response.suggestedQuestions
//       };

//       setMessages((prev) => [...prev, aiMessage]);
//     } catch (err) {
//       console.error('Chat error:', err);
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: `ai_err_${Date.now()}`,
//           sender: 'ai',
//           text: "I encountered an issue analyzing your insights. Please try asking again.",
//           timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//         }
//       ]);
//     } finally {
//       setIsTyping(false);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleResetChat = () => {
//     setCurrentInsightId(null);
//     setMessages(getInitialChatMessages(user.role, insights));
//   };

//   // Format markdown bolding, headings and bullets cleanly
//   const renderFormattedText = (text: string) => {
//     const lines = text.split('\n');
//     return (
//       <div className="space-y-2 text-[14.5px] leading-relaxed">
//         {lines.map((line, idx) => {
//           if (!line.trim()) return <div key={idx} className="h-1.5" />;
          
//           if (line.startsWith('### ')) {
//             return (
//               <h3 key={idx} className="text-base font-bold text-white tracking-tight pt-1 text-purple-200">
//                 {line.replace('### ', '')}
//               </h3>
//             );
//           }
          
//           if (line.startsWith('• ')) {
//             return (
//               <div key={idx} className="flex items-start gap-2 text-slate-200 pl-1">
//                 <span className="text-purple-400 font-bold mt-0.5">•</span>
//                 <span>{formatInlineMarkdown(line.substring(2))}</span>
//               </div>
//             );
//           }

//           return (
//             <p key={idx} className="text-slate-200">
//               {formatInlineMarkdown(line)}
//             </p>
//           );
//         })}
//       </div>
//     );
//   };

//   const formatInlineMarkdown = (str: string) => {
//     const parts = str.split(/(\*\*.*?\*\*)/g);
//     return parts.map((part, i) => {
//       if (part.startsWith('**') && part.endsWith('**')) {
//         return (
//           <strong key={i} className="font-semibold text-white">
//             {part.slice(2, -2)}
//           </strong>
//         );
//       }
//       return part;
//     });
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col px-4 sm:px-6 py-3 relative text-[#f8fafc]">
//       {/* Top Header Navigation */}
//       <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-3">
//         <div className="flex items-center gap-3">
//           <button
//             id="back-to-dashboard-btn"
//             onClick={onBackToDashboard}
//             className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer group shadow-sm"
//           >
//             <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-purple-400" />
//             <span>Back to Dashboard</span>
//           </button>

//           <div className="h-4 w-px bg-white/10" />

//           <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
//             <Sparkles className="w-4 h-4 text-purple-400" />
//             Ask Anything
//           </h1>
//         </div>

//         <button
//           onClick={handleResetChat}
//           title="Reset conversation"
//           className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-purple-300 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer"
//         >
//           <RotateCcw className="w-3.5 h-3.5" />
//           <span className="hidden sm:inline">Reset</span>
//         </button>
//       </div>

//       {/* Chat Messages Scroll Container */}
//       <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-[460px] max-h-[calc(100vh-230px)]">
//         <AnimatePresence initial={false}>
//           {messages.map((message) => {
//             const isAI = message.sender === 'ai';

//             return (
//               <motion.div
//                 key={message.id}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.25 }}
//                 className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
//               >
//                 {/* AI Avatar */}
//                 {isAI && (
//                   <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-900/30 border border-purple-400/30 mt-0.5">
//                     <Bot className="w-4 h-4" />
//                   </div>
//                 )}

//                 {/* Message Bubble */}
//                 <div className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
//                   <div
//                     className={`rounded-2xl px-4 sm:px-5 py-3.5 shadow-xl ${
//                       isAI
//                         ? 'bg-gradient-to-b from-[#1c1836] to-[#16132b] border border-indigo-500/20 text-slate-200 backdrop-blur-md'
//                         : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-normal border border-purple-400/30'
//                     }`}
//                   >
//                     {/* Related Insight Tag if present */}
//                     {isAI && message.relatedInsightTitle && (
//                       <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-white/10 text-[11px] font-semibold text-purple-300">
//                         <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
//                         <span>Referenced Insight: {message.relatedInsightTitle}</span>
//                       </div>
//                     )}

//                     {/* Formatted Message Content */}
//                     {isAI ? renderFormattedText(message.text) : <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{message.text}</p>}
//                   </div>

//                   {/* Timestamp */}
//                   <span className="text-[10px] text-slate-500 mt-1 px-1">
//                     {message.timestamp}
//                   </span>

//                   {/* Single Clean Suggested Questions Area (chips directly below AI message) */}
//                   {isAI && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
//                     <div className="flex flex-wrap gap-1.5 mt-2">
//                       {message.suggestedQuestions.map((sug, sIdx) => (
//                         <button
//                           key={sIdx}
//                           onClick={() => handleSend(sug)}
//                           className="text-xs px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-purple-900/40 border border-white/10 hover:border-purple-500/40 text-purple-300 hover:text-white transition-all cursor-pointer text-left flex items-center gap-1.5 shadow-sm"
//                         >
//                           <HelpCircle className="w-3 h-3 text-purple-400 shrink-0" />
//                           <span>{sug}</span>
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* User Avatar */}
//                 {!isAI && (
//                   <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white shrink-0 border border-white/10 mt-0.5">
//                     <User className="w-4 h-4 text-purple-300" />
//                   </div>
//                 )}
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>

//         {/* Typing indicator */}
//         {isTyping && (
//           <motion.div
//             initial={{ opacity: 0, y: 6 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="flex items-center gap-3"
//           >
//             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-900/30 border border-purple-400/30">
//               <Bot className="w-4 h-4" />
//             </div>
//             <div className="bg-[#1c1836] border border-indigo-500/20 rounded-2xl px-4 py-3 flex items-center gap-2">
//               <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
//               <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
//               <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
//               <span className="text-xs text-slate-400 ml-1">Analyzing insights...</span>
//             </div>
//           </motion.div>
//         )}

//         <div ref={messagesEndRef} />
//       </div>

//       {/* Modern & Compact Bottom Input Field */}
//       <div className="mt-3 relative z-10">
//         <div className="flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl bg-[#1c1836]/90 backdrop-blur-md border border-indigo-500/30 shadow-2xl focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
//           <input
//             ref={inputRef}
//             id="chat-input-field"
//             type="text"
//             value={inputQuery}
//             onChange={(e) => setInputQuery(e.target.value)}
//             onKeyDown={handleKeyDown}
//             disabled={isTyping}
//             placeholder="Type your question here... (e.g. Why did this happen?)"
//             className="flex-1 bg-transparent px-3 sm:px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none"
//           />

//           <button
//             id="chat-send-btn"
//             onClick={() => handleSend()}
//             disabled={!inputQuery.trim() || isTyping}
//             aria-label="Send message"
//             className="px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-purple-600/30 shrink-0"
//           >
//             <span>Send</span>
//             <Send className="w-3.5 h-3.5" />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

