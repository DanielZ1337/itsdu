import {cn} from "@/lib/utils";
import SidebarGroupTitle from "./sidebar-group-title";
import {useCourse} from "@/hooks/atoms/useCourse";
import {useSidebar} from "@/hooks/atoms/useSidebar";
import {courseNavLinks, navlinks} from "@/lib/routes";
import {AnimatePresence, m} from 'framer-motion';
import {NavLink} from "react-router-dom";
import {ErrorBoundary} from "react-error-boundary";
import SidebarUserFallback from "./sidebar-user-fallback";
import React, {lazy, Suspense} from "react";

const LazySidebarItem = lazy(() => import("./sidebar-item"));
const LazySidebarUser = lazy(() => import("./sidebar-user"));

export default function Sidebar() {
    const {sidebarActive, setSidebarActive} = useSidebar();
    const {courseId} = useCourse();
    const courseActive = courseId !== undefined;
    return (
        <div
            onMouseEnter={() => setSidebarActive(true)}
            onMouseLeave={() => setSidebarActive(false)}
            className={cn('will-change-auto overflow-hidden no-drag top-0 absolute transition-width h-full min-w-24 py-6 pb-4 px-4 z-20 bg-background flex flex-col justify-between', sidebarActive ? 'w-64' : 'w-24')}
        >
            <div className="flex h-full flex-col gap-1 overflow-x-hidden scrollbar-hide">
                <SidebarGroupTitle title="General"/>
                {navlinks.map((link) => (
                    <Suspense fallback={null} key={link.href}>
                        <LazySidebarItem
                            href={link.href}
                            title={link.title}
                            icon={link.icon}
                            end={link.end}
                            disabled={link.disabled}
                        />
                    </Suspense>
                ))}
                <AnimatePresence>
                    {courseActive && (
                        <m.div
                            initial={{opacity: 0, height: 0}}
                            animate={{opacity: 1, height: 'auto'}}
                            exit={{opacity: 0, height: 0}}
                            className="mb-3 flex flex-col gap-1"
                        >
                            <hr className="my-3"/>
                            <SidebarGroupTitle title="Course"/>
                            {courseNavLinks.map((link) => (
                                <Suspense fallback={null} key={link.href}>
                                    <LazySidebarItem
                                        href={`/courses/${courseId}${link.end ? '' : '/' + link.href}`}
                                        title={link.title}
                                        icon={link.icon}
                                        end={link.end}
                                        disabled={link.disabled}
                                    />
                                </Suspense>
                            ))}
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
            <hr className="mb-3"/>
            <NavLink to={'/profile'}
                     className={({isActive}) => cn("rounded-md flex py-2 px-3 text-left hover:bg-foreground/10 transition-all", isActive && "bg-foreground/10")}
            >
                <ErrorBoundary fallback={<SidebarUserFallback/>}>
                    <Suspense fallback={null}>
                        <LazySidebarUser/>
                    </Suspense>
                </ErrorBoundary>
            </NavLink>
        </div>
    );
}