const path = require('path');
const dotenv = require('dotenv');
const restify = require('restify');
const express = require('express');
const bodyParser = require('body-parser');

const TicketService = require('./services/TicketService');
const { initiateConversation, sendTeamsReply, sendTicketReply } = require('./controller');
const { messageQueue } = require('./queues/messageQueue');
const { EchoBot } = require('./bot');

const {
    CloudAdapter,
    ConfigurationBotFrameworkAuthentication
} = require('botbuilder');

const { ExpressAdapter } = require('@bull-board/express');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { createBullBoard } = require('@bull-board/api');

dotenv.config({ path: path.join(__dirname, '.env') });

const botServer = restify.createServer();
botServer.use(restify.plugins.bodyParser());

botServer.listen(process.env.PORT || 3978, () => {
    console.log(`🤖 Bot server listening on http://localhost:${process.env.PORT || 3978}`);
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(process.env);
const adapter = new CloudAdapter(botFrameworkAuthentication);
const myBot = new EchoBot();

adapter.onTurnError = async (context, error) => {
    console.error(`[onTurnError] unhandled error: ${error}`);
    await context.sendTraceActivity('OnTurnError Trace', `${error}`, 'https://www.botframework.com/schemas/error', 'TurnError');
    await context.sendActivity('The bot encountered an error.');
};

botServer.post('/api/messages', async (req, res) => {
    try {
        await messageQueue.add('teams-incoming-message', {
            body: req.body,
            headers: req.headers
        });
        res.send(200, { success: true, message: 'Message enqueued' });
    } catch (error) {
        console.error('Error enqueuing message:', error.message);
        res.send(500, { error: 'Failed to enqueue message', details: error.message });
    }
});

botServer.post('/api/sendReply', async (req, res) => {
    const { ticketId, message, email } = req.body;
    try {
        const ticket = await TicketService.findByTicketId(ticketId);
        await sendTicketReply(ticket.requestChannelConversationId, ticketId, message, email);
        await sendTicketReply(ticket.techChannelConversationId, ticketId, message, email);
        res.send(200, { success: true, message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error.message);
        res.send(500, { error: 'Failed to send reply.', details: error.message });
    }
});

botServer.post('/api/updateTicket', async (req, res) => {
    const { ticketId, subject, email } = req.body;
    try {
        const ticket = await TicketService.findById(ticketId);
        ticket.body = subject || ticket.subject;
        const technician = await TicketService.findTechnicianByemail(email);
        ticket.technicianId = technician.id;
        await ticket.save();
        await technician.save();
        res.send(200, { success: true, message: 'Ticket updated successfully' });
    } catch (error) {
        console.error('Error updating ticket:', error.message);
        res.send(500, { error: 'Failed to update ticket.', details: error.message });
    }
});

botServer.post('/initiate-conversation', async (req, res) => {
    const { technicianEmail, requesterEmail, ticketId } = req.body;
    try {
        await initiateConversation(requesterEmail, technicianEmail, ticketId);
        res.send(200, { success: true, message: 'Group chat created' });
    } catch (error) {
        console.error('Error initiating chat:', error.message);
        res.send(500, { error: 'Failed to create chat.', details: error.message });
    }
});

botServer.post('/webhook/reply', async (req, res) => {
    const { ticketId, replyMessage, repliedBy } = req.body;
    try {
        await sendTicketReply(null, ticketId, replyMessage, repliedBy);
        res.send(200, { success: true, message: 'Ticket reply sent' });
    } catch (error) {
        console.error('Error sending webhook reply:', error.message);
        res.send(500, { error: 'Failed to send ticket reply.', details: error.message });
    }
});

botServer.on('upgrade', async (req, socket, head) => {
    const streamingAdapter = new CloudAdapter(botFrameworkAuthentication);
    streamingAdapter.onTurnError = adapter.onTurnError;
    await streamingAdapter.process(req, socket, head, (context) => myBot.run(context));
});

const adminApp = express();
const adminPort = 3001;

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(messageQueue)],
    serverAdapter,
});

adminApp.use('/admin/queues', serverAdapter.getRouter());

adminApp.listen(adminPort, () => {
    console.log(`📊 Bull Board running at http://localhost:${adminPort}/admin/queues`);
});
