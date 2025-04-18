const axios = require('axios');

const { MicrosoftAppCredentials, ConnectorClient } = require('botframework-connector');
const { CardFactory } = require('botbuilder');

async function sendTeamsReply(parentMessageId, ticket, from) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });
    const activity = createTicketCard(ticket, true);
    if(parentMessageId != null){
        try {
            const response = await connectorClient.conversations.sendToConversation(parentMessageId,activity);
            console.log(`Message sent successfully with conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
        }
    }
    else { 
        const conversationParams = {
            isGroup: false,
            bot: { id: appId },
            members: [{ id : from }],
            activity: {
                type: 'message',
                text: 'created'
            },
            tenantId: process.env.MicrosoftAppTenantId,
            channelData: {}
        };
        try {
            const response = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`New chat started with conversation ID: ${response.id}`);
    
            await connectorClient.conversations.sendToConversation(response.id, activity);
            console.log(`Message sent successfully to conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error.response?.data || error.message);
        }
    }
}

async function sendTeamsChannelMessage(TeamId, channelId, ticket) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;
    const tenantId = process.env.MicrosoftAppTenantId;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = createTicketCard(ticket);

    const conversationParams = {
        isGroup: true,
        channelData: {
            channel: {
                id: channelId
            }
        },
        activity: activity,
        bot: {
            id: appId
        },
        tenantId : tenantId
    };

    try {
        const response = await connectorClient.conversations.createConversation(conversationParams);
        console.log(`Message sent to Teams channel. Conversation ID: ${response.id}`);
    } catch (error) {
        console.error('Error sending message to Teams channel:', error.response?.data || error.message);
    }
}

function createTicketCard(ticket, isDM = false) {
    const body = [
        {
            type: "TextBlock",
            text: "🎫 Ticket Created",
            weight: "Bolder",
            size: "Large",
            color: "Accent"
        },
        {
            type: "FactSet",
            facts: [
                { title: "Ticket ID:", value: ticket.id },
                { title: "Subject:", value: ticket.title || "N/A"},
                { title: "Message:", value: ticket.body || "N/A" },
                { title: "From:", value: ticket.name || "N/A" }
            ]
        }
    ];

    // Conditionally add a button only in DM
    if (isDM) {
        body.push({
            type: "ActionSet",
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Reply Ticket',
                    data: {
                        msteams: { type: 'task/fetch' },
                        data: 'replyTicket',
                        ticketId: ticket.id
                    }
                }
            ]
        });
    }

    return {
        type: "message",
        attachments: [
            {
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    type: "AdaptiveCard",
                    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                    version: "1.5",
                    body
                }
            }
        ]
    };
}
''
async function sendTicketReply(parentMessageId, ticketId, replyMessage, repliedBy) {
    const appId = process.env.MicrosoftAppId;
    const appPassword = process.env.MicrosoftAppPassword;

    const credentials = new MicrosoftAppCredentials(appId, appPassword);
    const connectorClient = new ConnectorClient(credentials, {
        baseUri: 'https://smba.trafficmanager.net/emea/'
    });

    const activity = {
        type: 'message',
        attachments: [
            CardFactory.adaptiveCard({
                type: 'AdaptiveCard',
                version: '1.3',
                body: [
                    {
                        type: 'TextBlock',
                        text: `Ticket ID: ${ticketId}`,
                        weight: 'bolder',
                        size: 'medium'
                    },
                    {
                        type: 'TextBlock',
                        text: `Replied By: ${repliedBy}`,
                        wrap: true
                    },
                    {
                        type: 'TextBlock',
                        text: `Message: ${replyMessage}`,
                        wrap: true
                    }
                ],
                actions: [
                    {
                        type: 'Action.Submit',
                        title: 'Reply',
                        data: {
                            msteams: { type: 'task/fetch' },
                            data: 'replyTicket',
                            ticketId: ticketId
                        }
                    }
                ]
            })
        ]
    };

    if (parentMessageId) {
        try {
            const response = await connectorClient.conversations.sendToConversation(parentMessageId, activity);
            console.log(`Message sent successfully with conversation ID: ${response.id}`);
        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
        }
    } else {
        // Create a proper conversation parameters object
        const conversationParams = {
            isGroup: false,
            tenantId: process.env.MicrosoftAppTenantId,
            botId: appId,
            members: [
                {
                    id: "29:1IPCeyBzb_nqOVoCZPCbG1gJsO5F8Y7DEef_NL8fEGFxAVKtadZ8cwemYFYm5g2GrD7EBcJGZ-nd10-i5_pR4cA"
                }
            ],
        };
    
        try {
            // First create the conversation
            const conversationResponse = await connectorClient.conversations.createConversation(conversationParams);
            console.log(`New chat started with conversation ID: ${conversationResponse.id}`);
            
            // Then send your message to the newly created conversation
            const messageResponse = await connectorClient.conversations.sendToConversation(
                conversationResponse.id, 
                activity
            );
            
            console.log(`Message sent successfully to conversation ID: ${conversationResponse.id}`);
        } catch (error) {
            console.error('Error creating conversation:', error);
            // Log the entire error object for debugging
            console.log('Full error object:', JSON.stringify(error, null, 2));
        }
    }
}

module.exports = { sendTeamsReply , sendTeamsChannelMessage, sendTicketReply };