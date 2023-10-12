import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";
import {AiOutlineSearch} from "react-icons/ai";
import {currentChatAtom} from "@/atoms/current-chat";
import {useAtom} from "jotai";

export default function MessagesSidebar({
                                            children
                                        }: {
    children: React.ReactNode
}) {
    const [, setCurrentChat] = useAtom(currentChatAtom)

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b flex gap-2">
                <form className="relative w-full">
                    <Input
                        placeholder="Search"
                        className="pl-10"
                    />
                    <div className="absolute top-1/2 transform -translate-y-1/2 left-3">
                        <AiOutlineSearch className="w-5 h-5 text-gray-500"/>
                    </div>
                </form>
                <Button onClick={() => setCurrentChat(-1)} variant={"outline"} size={"icon"} className={"shrink-0"}>
                    <Plus className={"w-5 h-5 text-gray-500"}/>
                </Button>
            </div>
            <div className="overflow-y-auto overflow-x-hidden">
                {children}
            </div>
        </div>
    )
}