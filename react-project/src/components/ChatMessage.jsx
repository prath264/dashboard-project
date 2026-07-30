import botimg from '../assets/bot.png';
import userimg from '../assets/user.webp';
import './ChatMessage.css';


export function ChatMessage({ message, sender }) {
    return (
        <div className={
            sender === 'user'
                ? 'chat-user'
                : 'chat-bot'
        }>
            {sender === 'user' && (
                <img src={userimg} className="chat-profile" />
            )}

            <div className="chat-messages">
                {message}
            </div>

            {sender === 'bot' && (
                <img src={botimg} className="chat-profile" />
            )}
        </div>
    );
}