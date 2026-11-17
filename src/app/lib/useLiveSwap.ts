import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

// Shared read/revalidation only. Polling never calls session-activity or extends
// agreement, session or assessment deadlines.
export function useLiveSwap(swapId?:string|null) {
  const [swap,setSwap]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const sequence=useRef(0);
  const refresh=useCallback(async(quiet=true)=>{
    const request=++sequence.current;if(!quiet)setLoading(true);
    try{
      if(!swapId)throw new Error("Choose an exchange to continue.");
      const data=await api(`/swaps/${encodeURIComponent(swapId)}`,{cache:"no-store"});
      if(request!==sequence.current)return;
      setSwap(data);setError("");return data;
    }catch(e){if(request===sequence.current)setError(e instanceof Error?e.message:"Unable to load this exchange.");}
    finally{if(request===sequence.current)setLoading(false);}
  },[swapId]);
  useEffect(()=>{
    setSwap(null);void refresh(false);
    const sync=()=>{if(document.visibilityState!=="hidden")void refresh();};
    window.addEventListener("focus",sync);window.addEventListener("pageshow",sync);document.addEventListener("visibilitychange",sync);
    return()=>{sequence.current++;window.removeEventListener("focus",sync);window.removeEventListener("pageshow",sync);document.removeEventListener("visibilitychange",sync);};
  },[refresh]);
  useEffect(()=>{
    if(!["PENDING_AGREEMENT","CONFIRMED"].includes(swap?.status))return;
    const timer=window.setInterval(()=>{if(document.visibilityState!=="hidden")void refresh();},10000);
    return()=>window.clearInterval(timer);
  },[swap?.status,refresh]);
  return {swap,loading,error,refresh};
}
