import {useCallback, useEffect, useRef} from "react";
import {driver, type Driver, type DriveStep} from "driver.js";

const COMPLETED_KEY="knoxite_onboarding_completed";
const steps:DriveStep[]=[
  {element:"#tour-knoxhub",popover:{title:"KnoxHub",description:"Browse skill exchange requests and find students you can learn with.",side:"right"}},
  {element:"#tour-my-skills",popover:{title:"My Skills",description:"Add skills you can teach and skills you want to learn.",side:"right"}},
  {element:"#tour-community-forum",popover:{title:"Community Forum",description:"Join student discussions and share useful ideas.",side:"right"}},
  {element:"#tour-leaderboard",popover:{title:"Leaderboard",description:"See eligible students ranked by peer feedback and exchange activity.",side:"right"}},
  {element:"#tour-nav-messages",popover:{title:"Messages",description:"Open conversations with your swap partners.",side:"bottom",align:"end"}},
  {element:"#tour-nav-notifications",popover:{title:"Notifications",description:"Check swap requests and updates about your exchanges.",side:"bottom",align:"end"}},
  {element:"#tour-nav-profile",popover:{title:"Your Account",description:"Open your profile, account settings and theme preferences.",side:"bottom",align:"end"}},
];
function renderedTarget(selector:string){
  const target=document.querySelector<HTMLElement>(selector);
  if(!target||!target.isConnected)return null;
  const rect=target.getBoundingClientRect(),style=getComputedStyle(target);
  return rect.width>0&&rect.height>0&&style.visibility!=="hidden"&&style.display!=="none"?target:null;
}

export function useOnboardingTour(){
  const active=useRef<Driver|null>(null);
  const startTour=useCallback((force=false)=>{
    if(active.current?.isActive())return;
    try{if(localStorage.getItem(COMPLETED_KEY)&&!force)return;}catch{/* Storage restrictions must not prevent dismissal. */}
    // Never start a blocking tour with a dummy/missing/hidden initial target.
    const available=steps.filter(step=>renderedTarget(step.element as string)).map(step=>({
      ...step,
      // Resolve again on navigation so native skipMissingElement also skips
      // targets hidden after startup. Driver treats a null resolver as missing.
      element:()=>renderedTarget(step.element as string)!,
    }));
    if(!available.length)return;
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    let transitioning=false;
    const syncControls=()=>{
      const popover=tour.getState().popover;
      if(!popover)return;
      popover.nextButton.disabled=transitioning;
      popover.previousButton.disabled=transitioning||!tour.hasPreviousStep();
    };
    const syncMotion=()=>{
      tour.setConfig({...tour.getConfig(),animate:!motion.matches,smoothScroll:!motion.matches});
      // Driver hides the outgoing popover until halfway through its animation.
      // Restart this same step without movement when the preference changes,
      // rather than ending that animation before its new popover was created.
      if(motion.matches&&transitioning)tour.moveTo(tour.getActiveIndex()??0);
    };
    const tour=driver({
      steps:available,
      animate:!motion.matches,
      duration:300,
      smoothScroll:!motion.matches,
      allowClose:true,
      allowKeyboardControl:true,
      skipMissingElement:true,
      overlayClickBehavior:"close",
      overlayOpacity:0.4,
      stagePadding:8,
      stageRadius:10,
      showProgress:true,
      showButtons:["previous","next","close"],
      nextBtnText:"Next",
      prevBtnText:"Previous",
      doneBtnText:"Finish",
      closeBtnLabel:"Skip tutorial",
      popoverClass:"knoxite-tour-popover",
      onHighlightStarted:()=>{transitioning=true;syncControls();},
      // A viewport change during Driver's first animation can precede its
      // settled target state. Re-measure once through Driver's own RAF queue.
      onHighlighted:()=>{tour.refresh();transitioning=false;syncControls();},
      onNextClick:()=>{if(!transitioning)tour.moveNext();},
      onPrevClick:()=>{if(!transitioning)tour.movePrevious();},
      onPopoverRender:popover=>{popover.closeButton.textContent="Skip";syncControls();},
      onDestroyed:()=>{
        motion.removeEventListener("change",syncMotion);
        if(active.current===tour)active.current=null;
        try{localStorage.setItem(COMPLETED_KEY,"true");}catch{/* Navigation and Escape still work without storage. */}
      },
    });
    motion.addEventListener("change",syncMotion);
    active.current=tour;
    tour.drive();
  },[]);
  useEffect(()=>()=>{
    // Route changes, browser Back and session expiry must not leave an overlay behind.
    active.current?.destroy();active.current=null;
  },[]);
  return{startTour};
}
