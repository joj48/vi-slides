import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/question-sidebar";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import type { GetClassResponse } from "@/lib/api";
import { getClassById } from "@/lib/api";
import Whiteboard from "@/components/Whiteboard";
import { getSocket } from "@/lib/socket";

const SessionPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [classData, setClassData] = useState<GetClassResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false); 

  useEffect(() => {
    if (!classId) return;

    const fetchClass = async () => {
      try {
        setLoading(true);

        const res = await getClassById(classId);
        setClassData(res.data);

        if (!res.data.isLive) {
          alert("Session has ended");
          navigate("/dashboard");
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [classId, navigate]);

useEffect(() => {
  if (!classId) return;

  const socket = getSocket();

  const handleUserJoined = (data: { userId: string }) => console.log("User joined:", data.userId);
  const handleUserLeft = (data: { userId: string }) => console.log("User left:", data.userId);
  const handleClassStarted = () => console.log("Class started");
  const handleClassEnded = (data: { classId: string }) => {
    if (data.classId !== classId) return; 

    alert("Session ended by instructor");
    const socket = getSocket();
    socket.disconnect(); 
    navigate("/dashboard");
  };

  const joinRoom = () => {
    socket.emit("join_class_room", { classId });
  };

  socket.on("user_joined", handleUserJoined);
  socket.on("user_left", handleUserLeft);
  socket.on("class_started", handleClassStarted);
  socket.on("class_ended", handleClassEnded);

  if (socket.connected) {
    joinRoom();
  } else {
    socket.once("connect", joinRoom);
    
  }

  return () => {
    socket.off("user_joined", handleUserJoined);
    socket.off("user_left", handleUserLeft);
    socket.off("class_started", handleClassStarted);
    socket.off("class_ended", handleClassEnded);
    socket.off("connect", joinRoom);
  };
}, [classId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex items-center justify-center min-h-dvh text-muted-foreground">
        {error || "Session not found"}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        questions={[
          { id: "1", title: "What is probability?" },
          { id: "2", title: "Explain Bayes theorem" },
        ]}
        activeId="1"
        onSelect={(id) => console.log(id)}
      />

      <SidebarInset className="bg-transparent">
        <div className="min-h-screen flex flex-col">
          <Topbar
            sessionName={classData.title}
            code={classData.classCode}
            classId={classData._id}
            onOpenWhiteboard={() => setShowWhiteboard(true)}
          />

          {showWhiteboard && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={() => setShowWhiteboard(false)} // ✅ outside click closes
  >
    <div
      className="w-[90%] h-[90%] bg-white rounded-lg overflow-hidden relative"
      onClick={(e) => e.stopPropagation()} // ✅ prevent inside click close
    >

      <Whiteboard />
    </div>
  </div>
)}

          <div className="flex-1 p-6">
            <Card className="h-full card-glass p-6">
              <p className="text-muted-foreground">
                Question Content Here
                {/* 
                FEATURE: Role-based Question Interaction UI

                Instructor View:
                - Slideable question cards
                - Answer + AI assist
                - Mark resolved

                Student View:
                - Ask question
                - Edit/Delete own question
              */}
              </p>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default SessionPage;
