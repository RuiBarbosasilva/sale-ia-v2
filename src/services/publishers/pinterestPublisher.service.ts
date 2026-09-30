import axios from 'axios';

export class PinterestPublisherService {
  private accessToken = process.env.PINTEREST_ACCESS_TOKEN || '';

  async getUserBoards() {
    try {
      const response = await axios.get('https://api.pinterest.com/v5/boards', {
        headers: { Authorization: 'Bearer ' + this.accessToken }
      });
      return response.data.items.map((board: any) => ({
        id: board.id,
        name: board.name,
        privacy: board.privacy
      }));
    } catch (error: any) {
      // Captura o erro EXATO da API do Pinterest
      const pinterestError = error.response?.data || error.message;
      console.error('[Pinterest] Erro detalhado da API:', JSON.stringify(pinterestError, null, 2));
      throw new Error('Falha Pinterest: ' + JSON.stringify(pinterestError));
    }
  }

  async createPin(boardId: string, title: string, description: string, link: string, imageUrl: string) {
    try {
      const payload = {
        board_id: boardId,
        title: title,
        description: description,
        link: link,
        media_source: {
          source_type: 'image_url',
          url: imageUrl
        }
      };

      const response = await axios.post('https://api.pinterest.com/v5/pins', payload, {
        headers: { 
          Authorization: 'Bearer ' + this.accessToken,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      const pinterestError = error.response?.data || error.message;
      console.error('[Pinterest] Erro ao criar Pin:', JSON.stringify(pinterestError, null, 2));
      throw new Error('Falha ao criar Pin: ' + JSON.stringify(pinterestError));
    }
  }
}
